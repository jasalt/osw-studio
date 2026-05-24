// lib/llm/coordinator.ts
// Multi-agent coordinator — intercepts `delegate` commands from the orchestrator loop
// and spawns child AgentLoops. Passes all other tool calls through to the inner executor.

import { AgentLoop } from './core/agent-loop';
import { ContextManagerImpl } from './core/context-manager';
import type {
  ToolExecutor,
  ToolCall,
  ToolResult,
  ToolExecContext,
  ProviderAdapter,
  ProgressReporter,
  CostTracker,
  AgentLoopConfig,
  CompactionConfig,
  AgentLoopResult,
} from './core/types';

export interface CoordinatorConfig {
  innerExecutor: ToolExecutor;
  provider: ProviderAdapter;
  progress: ProgressReporter;
  cost: CostTracker;
  projectId: string;
  chatMode: boolean;
  compactionConfig: CompactionConfig;
  buildSystemPrompt: (agentType: string) => Promise<string>;
}

export class MultiAgentCoordinator {
  private innerExecutor: ToolExecutor;
  private runningChildren = new Set<AgentLoop>();
  private stopped = false;

  private static readonly MAX_PARALLEL_DELEGATES = 8;

  constructor(private config: CoordinatorConfig) {
    this.innerExecutor = config.innerExecutor;
  }

  stop(): void {
    this.stopped = true;
    for (const child of this.runningChildren) {
      child.stop();
    }
    this.runningChildren.clear();
  }

  /**
   * Returns a ToolExecutor that intercepts `delegate` commands and spawns child loops,
   * passing everything else through to the inner executor.
   */
  createWrappedExecutor(): ToolExecutor {
    return {
      getDefinitions: (agentType: string) => this.innerExecutor.getDefinitions(agentType),
      execute: async (toolCall: ToolCall, context: ToolExecContext): Promise<ToolResult> => {
        const cmd = this.extractCmd(toolCall);
        const delegates = this.parseDelegateCommand(cmd);
        if (delegates && context.agentType === 'orchestrator') {
          const result = await this.runDelegates(delegates);
          return { tool_call_id: toolCall.id, content: result, success: true };
        }
        return this.innerExecutor.execute(toolCall, context);
      },
    };
  }

  // --- Private helpers ---

  private extractCmd(toolCall: ToolCall): string {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      return typeof args.cmd === 'string' ? args.cmd : '';
    } catch {
      return '';
    }
  }

  /**
   * Parse a delegate command string into typed prompts.
   *
   * Forms:
   *   delegate task "do X" "do Y"          → 2 parallel task agents
   *   delegate explore "single question"   → 1 agent
   *   delegate explore unquoted text       → 1 agent (backward compat)
   *   delegate type << 'EOF'\nprompt\nEOF  → 1 agent (heredoc)
   */
  private parseDelegateCommand(rawCmd: string): { type: string; prompt: string }[] | null {
    if (!rawCmd || !rawCmd.trimStart().startsWith('delegate ')) return null;
    const trimmed = rawCmd.trim();

    // Heredoc: delegate type << 'EOF'\nprompt\nEOF — always single agent
    const heredocRe = /^delegate\s+(explore|task|plan)\s*<<-?\s*['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\2\s*$/;
    const hm = trimmed.match(heredocRe);
    if (hm) return [{ type: hm[1], prompt: hm[3].trim() }];

    // Inline: delegate type followed by prompt(s)
    const inlineRe = /^delegate\s+(explore|task|plan)\s+([\s\S]+)$/;
    const im = trimmed.match(inlineRe);
    if (!im) return null;

    const type = im[1];
    const rest = im[2].trim();

    // Extract top-level quoted strings using a state machine.
    // Naive regex fails because HTML/code content contains inner quotes.
    const topLevelPrompts = this.extractTopLevelQuotedStrings(rest);

    if (topLevelPrompts.length >= 2) {
      return topLevelPrompts.map(prompt => ({ type, prompt }));
    }

    if (topLevelPrompts.length === 1) {
      return [{ type, prompt: topLevelPrompts[0] }];
    }

    // Unquoted text → single agent
    return [{ type, prompt: rest }];
  }

  /**
   * Extract top-level quoted strings from a delegate command's argument portion.
   * Uses a state machine to handle nested quotes in HTML/code content.
   * Only splits on quotes that start after whitespace (top-level boundary).
   */
  private extractTopLevelQuotedStrings(input: string): string[] {
    const prompts: string[] = [];
    let i = 0;

    while (i < input.length) {
      // Skip whitespace between prompts
      while (i < input.length && /\s/.test(input[i])) i++;
      if (i >= input.length) break;

      const quoteChar = input[i];
      if (quoteChar !== '"' && quoteChar !== "'") {
        // Not a quoted string — this is unquoted trailing text, consume rest
        prompts.push(input.slice(i).trim());
        break;
      }

      // Found opening quote — scan for the matching UNESCAPED closing quote
      // at the same level (the next quote char preceded by whitespace or at end).
      // Strategy: find the closing quote that is followed by either:
      //   - end of string
      //   - whitespace then another quote char (next prompt)
      //   - whitespace then end of string
      i++; // skip opening quote
      const start = i;

      while (i < input.length) {
        const ch = input[i];
        if (ch === '\\') { i += 2; continue; } // skip escaped chars

        // Track heredoc-style content (<<) — skip until delimiter
        if (ch === '<' && i + 1 < input.length && input[i + 1] === '<') {
          // Inside heredoc — skip to matching EOF/delimiter
          const heredocMatch = input.slice(i).match(/^<<-?\s*['"]?(\w+)['"]?\s*\n/);
          if (heredocMatch) {
            const delimiter = heredocMatch[1];
            const endIdx = input.indexOf('\n' + delimiter, i + heredocMatch[0].length);
            if (endIdx !== -1) {
              i = endIdx + delimiter.length + 1;
              continue;
            }
          }
        }

        if (ch === quoteChar) {
          // Check if this is the closing top-level quote:
          // It should be followed by whitespace+quote, whitespace+end, or end
          const after = input.slice(i + 1).trimStart();
          if (after.length === 0 || after[0] === '"' || after[0] === "'") {
            // This is the closing quote
            prompts.push(input.slice(start, i).trim());
            i++; // skip closing quote
            break;
          }
          // Otherwise it's an inner quote — keep scanning
        }

        i++;
      }

      // If we ran off the end without finding a closing quote, take what we have
      if (i >= input.length) {
        const content = input.slice(start).trim();
        if (content) prompts.push(content);
      }
    }

    return prompts;
  }

  /**
   * Run one delegate child agent. Creates a fresh AgentLoop with restricted config.
   */
  private async runDelegateChild(
    type: string,
    prompt: string,
    agentIndex: number
  ): Promise<{ type: string; prompt: string; body: string }> {
    if (this.stopped) {
      return { type, prompt, body: '(Cancelled — parent stopped)' };
    }

    const promptLabel = prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt;
    this.config.progress.onEvent('delegate_progress', {
      type,
      event: 'agent_start',
      agentIndex,
      delegatePrompt: promptLabel,
    });

    // Create fresh context for child
    const childContext = new ContextManagerImpl(this.config.compactionConfig);
    const systemPrompt = await this.config.buildSystemPrompt(type);
    childContext.setSystemPrompt(systemPrompt);

    const childConfig: AgentLoopConfig = {
      maxIterations: type === 'explore' ? 5 : type === 'plan' ? 10 : 30,
      maxNudges: type === 'explore' ? 1 : 2,
      maxDuplicateToolCalls: 3,
      agentType: type,
      isReadOnly: this.config.chatMode || type === 'explore' || type === 'plan',
    };

    const childLoop = new AgentLoop({
      config: childConfig,
      provider: this.config.provider,
      executor: this.innerExecutor, // Inner — children cannot delegate
      context: childContext,
      progress: {
        onEvent: (event: string, data?: Record<string, unknown>) => {
          // Forward selected events to parent's progress reporter
          const FORWARDED = new Set([
            'tool_status', 'tool_result', 'error', 'stopped', 'nudge', 'exit_reason',
          ]);
          if (FORWARDED.has(event)) {
            this.config.progress.onEvent('delegate_progress', {
              type,
              event,
              data,
              agentIndex,
              delegatePrompt: promptLabel,
            });
          }
        },
      },
      cost: this.config.cost, // Shared — accumulates into parent
    });

    this.runningChildren.add(childLoop);
    let result: AgentLoopResult;
    try {
      result = await childLoop.run(prompt);
    } finally {
      this.runningChildren.delete(childLoop);
    }

    // Extract last assistant message as the body
    const messages = childContext.getMessages();
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    let rawResult = '';
    if (lastAssistant) {
      rawResult = typeof lastAssistant.content === 'string'
        ? lastAssistant.content
        : JSON.stringify(lastAssistant.content);
    }
    const maxLen = 2500;
    const body = rawResult.length > maxLen
      ? rawResult.slice(0, maxLen) + '\n... (truncated)'
      : rawResult;

    this.config.progress.onEvent('delegate_progress', {
      type,
      event: 'agent_done',
      agentIndex,
      delegatePrompt: promptLabel,
      data: { body: body.slice(0, 120), success: result.success },
    });

    return { type, prompt, body };
  }

  /**
   * Run delegates and combine their results into a single string for the parent context.
   */
  private async runDelegates(delegates: { type: string; prompt: string }[]): Promise<string> {
    if (delegates.length > MultiAgentCoordinator.MAX_PARALLEL_DELEGATES) {
      const cap = MultiAgentCoordinator.MAX_PARALLEL_DELEGATES;
      return `Error: Too many parallel delegates (${delegates.length}). Maximum is ${cap}. Break the work into smaller batches.`;
    }

    // Single delegate — compact result
    if (delegates.length === 1) {
      const { type, prompt } = delegates[0];
      const r = await this.runDelegateChild(type, prompt, 1);
      const label = prompt.length > 120 ? prompt.slice(0, 120) + '...' : prompt;
      return `[delegate ${type} — done] "${label}"\n\n${r.body || '(no result)'}\n\n${this.getDelegateFooter(type)}`;
    }

    // Multiple delegates — run in parallel
    const settled = await Promise.allSettled(
      delegates.map(({ type, prompt }, i) => this.runDelegateChild(type, prompt, i + 1))
    );

    const type = delegates[0].type;
    const sections: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      const label = delegates[i].prompt.length > 100
        ? delegates[i].prompt.slice(0, 100) + '...'
        : delegates[i].prompt;

      if (s.status === 'fulfilled') {
        sections.push(`[${i + 1}/${delegates.length}] "${label}"\n${s.value.body || '(no result)'}`);
      } else {
        sections.push(`[${i + 1}/${delegates.length}] "${label}"\nError: ${s.reason}`);
      }
    }

    return `[delegate ${type} — done] ${delegates.length} agents completed\n\n${sections.join('\n\n')}\n\n${this.getDelegateFooter(type)}`;
  }

  /**
   * Type-specific footer appended to delegate results.
   */
  private getDelegateFooter(type: string): string {
    if (type === 'explore') return 'Use these findings to inform your next steps. The explore agent was read-only — no files were modified.';
    if (type === 'plan') return 'This is an analysis only — no files were modified. Implement the changes yourself based on this plan.';
    if (type === 'task') return 'This specific sub-task is done and its files were modified. Do not repeat this same delegate.';
    return '';
  }
}
