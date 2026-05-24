/**
 * OswsToolExecutor - Handles individual tool call execution with signal extraction.
 *
 * Responsibilities:
 * - Sanitize tool names (strip harmony tokens)
 * - Validate tool access per agent type
 * - Dispatch to toolRegistry
 * - Extract signals from results (statusComplete, statusResult, setupComplete, awaitingUser)
 * - Emit progress events (tool_status, tool_result)
 * - Provide onAfterExecute hook for facade checkpoint logic
 */

import type { ToolExecutor, ToolCall, ToolResult, ToolExecContext, ToolDef, ProgressReporter } from './core/types';
import { toolRegistry, ToolExecutionContext } from './tool-registry';
import { Agent } from './agent';

const HARMONY_TOKEN_STRIP_RE = /<\|[^|]*\|>/g;

export interface OswsToolExecutorConfig {
  projectId: string;
  progress: ProgressReporter;
  getAgent: () => Agent;
  chatMode: boolean;
  abortSignal: AbortSignal;
}

export class OswsToolExecutor implements ToolExecutor {
  onAfterExecute?: (toolCall: ToolCall, result: ToolResult) => Promise<void>;

  constructor(private config: OswsToolExecutorConfig) {}

  getDefinitions(agentType: string): ToolDef[] {
    const agent = this.config.getAgent();
    const defs = toolRegistry.getDefinitions(agent.tools, agentType);
    return defs.map(d => ({
      name: d.name,
      description: d.description,
      parameters: d.parameters as Record<string, unknown>,
    }));
  }

  async execute(toolCall: ToolCall, context: ToolExecContext): Promise<ToolResult> {
    // 1. Sanitize tool name (strip <|...|> harmony tokens)
    const rawName = toolCall.function?.name;
    const toolId = rawName?.replace(HARMONY_TOKEN_STRIP_RE, '').trim();

    if (!toolId) {
      return {
        tool_call_id: toolCall.id,
        content: 'Error: Tool call has no function name. Available tools: shell.',
        success: false,
      };
    }

    // 2. Validate tool access
    const agent = this.config.getAgent();
    if (!agent.hasTool(toolId)) {
      const errorMsg = this.buildToolAccessError(toolId, agent.type);
      this.config.progress.onEvent('tool_status', {
        toolName: toolId,
        status: 'failed',
        args: toolCall.function?.arguments,
      });
      return { tool_call_id: toolCall.id, content: errorMsg, success: false };
    }

    // 3. Emit executing status
    this.config.progress.onEvent('tool_status', {
      toolName: toolId,
      status: 'executing',
      args: toolCall.function.arguments,
    });

    // 4. Dispatch to registry with signal/ask/setup detection
    let setupComplete = false;
    let awaitingUser = false;

    const execContext: ToolExecutionContext = {
      agentType: context.agentType,
      isReadOnly: context.isReadOnly || this.config.chatMode,
      onProgress: (event, data) => {
        if (event === 'ask') awaitingUser = true;
        if (event === 'project_ready') setupComplete = true;
        this.config.progress.onEvent(event, data);
      },
    };

    try {
      const resultContent = await Promise.race([
        toolRegistry.execute(toolCall, this.config.projectId, execContext),
        new Promise<string>((_, reject) => {
          if (this.config.abortSignal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          this.config.abortSignal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        }),
      ]);

      const isError = resultContent.startsWith('Error:');
      const signals = this.extractSignals(toolCall, resultContent, setupComplete, awaitingUser);

      const result: ToolResult = {
        tool_call_id: toolCall.id,
        content: resultContent,
        success: !isError,
        ...(Object.keys(signals).length > 0 && { signals }),
      };

      this.config.progress.onEvent('tool_status', {
        toolName: toolId,
        status: isError ? 'failed' : 'completed',
        result: resultContent,
        ...(isError && { error: resultContent }),
      });
      this.config.progress.onEvent('tool_result', { result: resultContent });

      if (this.onAfterExecute) await this.onAfterExecute(toolCall, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result: ToolResult = {
        tool_call_id: toolCall.id,
        content: `Error: ${errorMessage}`,
        success: false,
      };

      this.config.progress.onEvent('tool_status', {
        toolName: toolId,
        status: 'failed',
        error: errorMessage,
      });

      if (this.onAfterExecute) await this.onAfterExecute(toolCall, result);

      return result;
    }
  }

  /**
   * Extract signals from a tool call result. Inspects the command and output
   * to detect status completions, setup events, and user-awaiting states.
   */
  private extractSignals(
    toolCall: ToolCall,
    output: string,
    setupComplete: boolean,
    awaitingUser: boolean
  ): Record<string, unknown> {
    const signals: Record<string, unknown> = {};

    if (setupComplete) signals.setupComplete = true;
    if (awaitingUser) signals.awaitingUser = true;

    // Parse the command from tool call arguments
    let cmd = '';
    try {
      const args = JSON.parse(toolCall.function.arguments);
      cmd = typeof args.cmd === 'string' ? args.cmd : '';
    } catch {
      return signals;
    }

    // Detect status commands
    if (/^\s*status\b/i.test(cmd)) {
      // Simple complete detection: command contains "complete" flag but not "--incomplete"
      if (/--complete\b/i.test(cmd) && !/--incomplete\b/i.test(cmd)) {
        signals.statusComplete = true;
      }

      // Also detect "status complete ..." shorthand
      if (/^\s*status\s+complete\b/i.test(cmd)) {
        signals.statusComplete = true;
      }

      // Full status result extraction
      const statusResult = this.extractStatusResult(cmd, output);
      if (statusResult) {
        signals.statusResult = statusResult;
        if (statusResult.complete) signals.statusComplete = true;
      }
    }

    return signals;
  }

  /**
   * Extract structured status result from a shell command or its output.
   * Detects: `status --task "..." --done "..." --remaining "..." --complete`
   */
  private extractStatusResult(
    cmd: string,
    output: string
  ): { task: string; done: string; remaining: string; complete: boolean; hasExplicitFlag: boolean } | null {
    // If the output contains an error, the status command failed - don't trust command-level parsing
    const hasError = output && /^Error:\s/im.test(output);

    // 1. Check shell output for Task:/Done:/Remaining:/Complete: lines (from cli-shell status handler)
    // Prefer output over command parsing since it reflects actual execution result
    if (output) {
      const taskLine = output.match(/^Task:\s*(.+)/im);
      const doneLine = output.match(/^Done:\s*(.+)/im);
      const remainingLine = output.match(/^Remaining:\s*(.*)/im);
      const completeLine = output.match(/^Complete:\s*(yes|no)/im);
      if (taskLine && doneLine) {
        return {
          task: taskLine[1].trim(),
          done: doneLine[1].trim(),
          remaining: remainingLine ? remainingLine[1].trim() : 'none',
          complete: completeLine ? completeLine[1].toLowerCase() === 'yes' : false,
          hasExplicitFlag: !!completeLine,
        };
      }
    }

    // 2. Fallback: check the command itself for `status --task ... --done ... --remaining ...`
    // Skip if the output had errors - the command may have been malformed
    if (!hasError && /^\s*status\b/i.test(cmd)) {
      const taskMatch =
        cmd.match(/--task\s+"([^"]*)"/) ||
        cmd.match(/--task\s+'([^']*)'/) ||
        cmd.match(/--task\s+(\S+)/);
      const doneMatch =
        cmd.match(/--done\s+"([^"]*)"/) ||
        cmd.match(/--done\s+'([^']*)'/) ||
        cmd.match(/--done\s+(\S+)/);
      const remainingMatch =
        cmd.match(/--remaining\s+"([^"]*)"/) ||
        cmd.match(/--remaining\s+'([^']*)'/) ||
        cmd.match(/--remaining\s+(\S+)/);
      const hasComplete = /--complete\b/.test(cmd);
      const hasIncomplete = /--incomplete\b/.test(cmd);
      if (taskMatch && doneMatch) {
        return {
          task: taskMatch[1],
          done: doneMatch[1],
          remaining: remainingMatch ? remainingMatch[1] : 'none',
          complete: hasComplete && !hasIncomplete,
          hasExplicitFlag: hasComplete || hasIncomplete,
        };
      }
    }

    return null;
  }

  /**
   * Build a helpful error message when a tool is not accessible to the current agent.
   * Guides the model to use the correct tool invocation pattern.
   */
  private buildToolAccessError(toolId: string, agentType: string): string {
    const knownShellCommands = new Set([
      'ls', 'tree', 'cat', 'head', 'tail', 'rg', 'grep', 'find',
      'mkdir', 'touch', 'rm', 'mv', 'cp', 'echo', 'sed', 'ss', 'wc',
      'sort', 'uniq', 'tr', 'curl', 'sqlite3', 'python', 'python3',
      'lua', 'preview', 'build', 'status', 'delegate', 'runtime',
      'ask',
    ]);
    const setupOnlyCommands = new Set(['brief', 'spec', 'propose-create']);
    const isSetupCommand = setupOnlyCommands.has(toolId);
    const isShellCommand = knownShellCommands.has(toolId) || (isSetupCommand && agentType === 'setup');

    if (toolId === 'ss') {
      return `Error: "ss" is not a tool — it is a shell command. Call it via the shell tool:\n\n  shell({ cmd: "ss /file << 'EOF'\\nsearch text\\n===\\nreplacement text\\nEOF" })`;
    }

    if (isShellCommand) {
      return `Error: "${toolId}" is not a tool — it is a shell command. Use the shell tool to run it:\n\n  shell({ cmd: "${toolId} ..." })`;
    }

    const commandList = agentType === 'setup'
      ? 'brief, spec, ask, propose-create'
      : 'ls, tree, cat, head, tail, rg, grep, find, mkdir, touch, rm, mv, cp, echo, sed, ss, wc, sort, uniq, tr, curl, sqlite3, python, python3, lua, preview, build, status';

    return `Error: Unknown tool "${toolId}". Available tools: shell.\n\nThe shell tool supports these commands: ${commandList}`;
  }
}
