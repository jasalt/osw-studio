import { describe, it, expect, vi } from 'vitest';
import { AgentLoop } from '../core/agent-loop';
import type {
  ProviderAdapter,
  ToolExecutor,
  ContextManager,
  ProgressReporter,
  CostTracker,
  AgentLoopConfig,
  ParsedResponse,
  ToolResult,
  ToolCall,
  ToolDef,
  Message,
  UsageInfo,
} from '../core/types';

// --- Mock factories ---

function createMockProvider(responses: ParsedResponse[]): ProviderAdapter {
  let callIndex = 0;
  return {
    call: vi.fn(async () => {
      if (callIndex >= responses.length) {
        return { content: '' };
      }
      return responses[callIndex++];
    }),
    getModel: () => 'test-model',
    getProvider: () => 'test-provider',
    supportsTools: () => true,
  };
}

function createMockExecutor(results?: Map<string, ToolResult>): ToolExecutor {
  return {
    execute: vi.fn(async (toolCall: ToolCall) => {
      if (results && results.has(toolCall.id)) {
        return results.get(toolCall.id)!;
      }
      return {
        tool_call_id: toolCall.id,
        content: 'OK',
        success: true,
      };
    }),
    getDefinitions: () => [{ name: 'bash', description: 'Run shell', parameters: {} }] as ToolDef[],
  };
}

function createMockContext(): ContextManager {
  const messages: Message[] = [];
  return {
    getMessages: () => messages,
    setSystemPrompt: vi.fn((prompt: string) => {
      if (messages.length > 0 && messages[0].role === 'system') {
        messages[0] = { role: 'system', content: prompt };
      } else {
        messages.unshift({ role: 'system', content: prompt });
      }
    }),
    addUserMessage: vi.fn((content: string) => {
      messages.push({ role: 'user', content });
    }),
    addAssistantTurn: vi.fn((response: ParsedResponse) => {
      messages.push({
        role: 'assistant',
        content: response.content || '',
        ...(response.toolCalls?.length ? { tool_calls: response.toolCalls } : {}),
      });
    }),
    addToolResults: vi.fn((results: ToolResult[]) => {
      for (const r of results) {
        messages.push({ role: 'tool', content: r.content, tool_call_id: r.tool_call_id });
      }
    }),
    importMessages: vi.fn(),
    needsCompaction: () => false,
    compact: vi.fn(async () => undefined),
    getTokenEstimate: () => 1000,
    getCompactionCount: () => 0,
  };
}

function createMockProgress(): ProgressReporter {
  return { onEvent: vi.fn() };
}

function createMockCost(): CostTracker {
  return {
    record: vi.fn(),
    getTurnCost: () => 0,
    getTotalCost: () => 0,
    getTotalUsage: () => ({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }),
    resetTurn: vi.fn(),
  };
}

function defaultConfig(overrides?: Partial<AgentLoopConfig>): AgentLoopConfig {
  return {
    maxIterations: 20,
    maxNudges: 2,
    maxDuplicateToolCalls: 3,
    agentType: 'orchestrator',
    isReadOnly: false,
    ...overrides,
  };
}

// --- Tests ---

describe('AgentLoop', () => {
  it('completes when model returns statusComplete signal', async () => {
    // 1. Provider returns a tool call, 2. Provider returns text (after status signal)
    const toolCall: ToolCall = {
      id: 'tc1',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"status --task \\"build site\\" --done \\"all\\" --remaining \\"none\\" --complete"}' },
    };

    const provider = createMockProvider([
      { content: '', toolCalls: [toolCall] },
      { content: 'All done!' },
    ]);

    const toolResult: ToolResult = {
      tool_call_id: 'tc1',
      content: 'Status recorded.',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 'build site', done: 'all', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };
    const results = new Map([['tc1', toolResult]]);
    const executor = createMockExecutor(results);
    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig();

    const loop = new AgentLoop({
      config,
      provider,
      executor,
      context,
      progress,
      cost,
    });

    const result = await loop.run('Build me a site');
    expect(result.success).toBe(true);
    expect(result.toolCount).toBe(1);
    expect(result.turnCount).toBeGreaterThanOrEqual(1);
  });

  it('stops after maxNudges when model returns text without tool calls', async () => {
    // Model always returns text, never tools — should nudge then stop
    const provider = createMockProvider([
      { content: 'Let me think about that...' },
      { content: 'Still thinking...' },
      { content: 'Almost there...' },
      { content: 'One more thought...' },
      { content: 'Final thought.' },
    ]);

    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig({ maxNudges: 2 });

    const loop = new AgentLoop({
      config,
      provider,
      executor: createMockExecutor(),
      context,
      progress,
      cost,
    });

    const result = await loop.run('Do something');
    // First response = text, nudge 1, second response = text, nudge 2, third response = text, break
    expect(result.success).toBe(false);
    expect(result.summary).toContain('nudge');
  });

  it('detects duplicate tool calls and stops after maxDuplicateToolCalls', async () => {
    const duplicateCall: ToolCall = {
      id: 'tc-dup',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"ls"}' },
    };

    // Same tool call repeated multiple times
    const provider = createMockProvider([
      { content: '', toolCalls: [{ ...duplicateCall, id: 'tc1' }] },
      { content: '', toolCalls: [{ ...duplicateCall, id: 'tc2' }] },
      { content: '', toolCalls: [{ ...duplicateCall, id: 'tc3' }] },
      { content: '', toolCalls: [{ ...duplicateCall, id: 'tc4' }] },
    ]);

    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig({ maxDuplicateToolCalls: 3 });

    const loop = new AgentLoop({
      config,
      provider,
      executor: createMockExecutor(),
      context,
      progress,
      cost,
    });

    const result = await loop.run('Do the thing');
    expect(result.success).toBe(false);
    expect(result.summary).toContain('loop');
  });

  it('calls completionGate before accepting completion', async () => {
    let gateCallCount = 0;
    const completionGate = vi.fn(async () => {
      gateCallCount++;
      // First call returns error (blocks completion), second returns null (allows it)
      if (gateCallCount === 1) return 'Runtime error: undefined is not a function';
      return null;
    });

    // Use different command strings so they don't trigger duplicate detection
    const toolCall1: ToolCall = {
      id: 'tc1',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"status --task \\"build\\" --done \\"all\\" --remaining \\"none\\" --complete"}' },
    };
    const toolCall2: ToolCall = {
      id: 'tc2',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"status --task \\"build site\\" --done \\"everything\\" --remaining \\"none\\" --complete"}' },
    };

    const toolResult1: ToolResult = {
      tool_call_id: 'tc1',
      content: 'Status recorded.',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 'build', done: 'all', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };
    const toolResult2: ToolResult = {
      tool_call_id: 'tc2',
      content: 'Status recorded.',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 'build site', done: 'everything', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };

    // First iteration: tool call with statusComplete. Gate blocks.
    // Second iteration: different tool call with statusComplete. Gate allows.
    const provider = createMockProvider([
      { content: '', toolCalls: [toolCall1] },
      { content: '', toolCalls: [toolCall2] },
    ]);

    const results = new Map([
      ['tc1', toolResult1],
      ['tc2', toolResult2],
    ]);
    const executor = createMockExecutor(results);
    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig({ completionGate });

    const loop = new AgentLoop({
      config,
      provider,
      executor,
      context,
      progress,
      cost,
    });

    const result = await loop.run('Build it');
    expect(completionGate).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it('handles provider error via onPausableError with continue', async () => {
    let callCount = 0;
    const provider: ProviderAdapter = {
      call: vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Rate limited');
        }
        // Second call succeeds with a tool call that signals complete
        return {
          content: '',
          toolCalls: [{
            id: 'tc1',
            type: 'function' as const,
            function: { name: 'bash', arguments: '{"command":"status --task \\"x\\" --done \\"x\\" --remaining \\"none\\" --complete"}' },
          }],
        };
      }),
      getModel: () => 'test-model',
      getProvider: () => 'test-provider',
      supportsTools: () => true,
    };

    const onPausableError = vi.fn(async () => 'continue' as const);

    const toolResult: ToolResult = {
      tool_call_id: 'tc1',
      content: 'Status recorded.',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 'x', done: 'x', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };
    const results = new Map([['tc1', toolResult]]);
    const executor = createMockExecutor(results);
    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig({ onPausableError });

    const loop = new AgentLoop({
      config,
      provider,
      executor,
      context,
      progress,
      cost,
    });

    const result = await loop.run('Do it');
    expect(onPausableError).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('explore agent exits immediately without needing status', async () => {
    const provider = createMockProvider([
      { content: 'Here is the analysis of the codebase...' },
    ]);

    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig({ agentType: 'explore' });

    const loop = new AgentLoop({
      config,
      provider,
      executor: createMockExecutor(),
      context,
      progress,
      cost,
    });

    const result = await loop.run('Analyze this');
    expect(result.success).toBe(true);
    expect(result.turnCount).toBe(1);
    // Should not have nudged — immediate exit
    const events = (progress.onEvent as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
    expect(events).not.toContain('nudge');
  });

  it('handles onPausableError returning stop', async () => {
    const provider: ProviderAdapter = {
      call: vi.fn(async () => {
        throw new Error('Fatal error');
      }),
      getModel: () => 'test-model',
      getProvider: () => 'test-provider',
      supportsTools: () => true,
    };

    const onPausableError = vi.fn(async () => 'stop' as const);
    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig({ onPausableError });

    const loop = new AgentLoop({
      config,
      provider,
      executor: createMockExecutor(),
      context,
      progress,
      cost,
    });

    const result = await loop.run('Do it');
    expect(onPausableError).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.summary).toContain('error');
  });

  it('extracts tool calls from text for models without native tool support', async () => {
    const provider: ProviderAdapter = {
      call: vi.fn(async () => ({
        content: '```bash\nls -la\n```',
        toolCalls: undefined,
      })),
      getModel: () => 'test-model',
      getProvider: () => 'test-provider',
      supportsTools: () => false, // no native tool support
    };

    // After extraction, the tool call signals complete
    const executor: ToolExecutor = {
      execute: vi.fn(async (toolCall: ToolCall) => ({
        tool_call_id: toolCall.id,
        content: 'files listed',
        success: true,
        signals: { statusComplete: true, statusResult: { task: 'x', done: 'x', remaining: 'none', complete: true, hasExplicitFlag: true } },
      })),
      getDefinitions: () => [{ name: 'bash', description: 'Run shell', parameters: {} }],
    };

    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig();

    const loop = new AgentLoop({
      config,
      provider,
      executor,
      context,
      progress,
      cost,
    });

    const result = await loop.run('List files');
    expect(executor.execute).toHaveBeenCalled();
    expect(result.toolCount).toBe(1);
  });

  it('stops when stop() is called', async () => {
    let callCount = 0;
    const provider: ProviderAdapter = {
      call: vi.fn(async () => {
        callCount++;
        return {
          content: '',
          toolCalls: [{
            id: `tc${callCount}`,
            type: 'function' as const,
            function: { name: 'bash', arguments: `{"command":"echo ${callCount}"}` },
          }],
        };
      }),
      getModel: () => 'test-model',
      getProvider: () => 'test-provider',
      supportsTools: () => true,
    };

    const context = createMockContext();
    const progress = createMockProgress();
    const cost = createMockCost();
    const config = defaultConfig();

    const loop = new AgentLoop({
      config,
      provider,
      executor: createMockExecutor(),
      context,
      progress,
      cost,
    });

    // Stop after first iteration
    (provider.call as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      if (callCount > 0) loop.stop();
      callCount++;
      return {
        content: '',
        toolCalls: [{
          id: `tc${callCount}`,
          type: 'function' as const,
          function: { name: 'bash', arguments: `{"command":"echo ${callCount}"}` },
        }],
      };
    });

    const result = await loop.run('Do something');
    expect(result.success).toBe(false);
    expect(result.summary).toContain('Stopped');
  });

  it('triggers compaction using token estimate when provider reports no usage', async () => {
    const toolCall: ToolCall = {
      id: 'tc1',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"status --task \\"t\\" --done \\"d\\" --remaining \\"none\\" --complete"}' },
    };
    // Provider returns no usage (simulating providers that don't support stream_options)
    const provider = createMockProvider([
      { content: '', toolCalls: [toolCall] },
      { content: 'Done.' },
    ]);

    const context = createMockContext();
    // getTokenEstimate returns a value above threshold — should trigger compaction
    context.getTokenEstimate = () => 999999;
    context.needsCompaction = (tokenCount: number) => tokenCount >= 80000;

    const toolResult: ToolResult = {
      tool_call_id: 'tc1',
      content: 'Status recorded.',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 't', done: 'd', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };
    const executor = createMockExecutor(new Map([['tc1', toolResult]]));
    const progress = createMockProgress();
    // promptTokens=0 simulates missing usage
    const cost = createMockCost();

    const loop = new AgentLoop({
      config: defaultConfig(),
      provider,
      executor,
      context,
      progress,
      cost,
    });

    await loop.run('Build something');
    expect(context.compact).toHaveBeenCalled();
  });

  it('uses reported promptTokens for compaction check when available', async () => {
    const toolCall: ToolCall = {
      id: 'tc1',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"status --task \\"t\\" --done \\"d\\" --remaining \\"none\\" --complete"}' },
    };
    const provider = createMockProvider([
      { content: '', toolCalls: [toolCall], usage: { promptTokens: 90000, completionTokens: 500, totalTokens: 90500 } },
      { content: 'Done.' },
    ]);

    const context = createMockContext();
    context.getTokenEstimate = () => 5000; // Low estimate — should NOT be used
    context.needsCompaction = (tokenCount: number) => tokenCount >= 80000;

    const toolResult: ToolResult = {
      tool_call_id: 'tc1',
      content: 'ok',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 't', done: 'd', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };
    const executor = createMockExecutor(new Map([['tc1', toolResult]]));
    const progress = createMockProgress();
    const cost = createMockCost();
    cost.getTotalUsage = () => ({ promptTokens: 90000, completionTokens: 500, totalTokens: 90500 });

    const loop = new AgentLoop({
      config: defaultConfig(),
      provider,
      executor,
      context,
      progress,
      cost,
    });

    await loop.run('Build something');
    expect(context.compact).toHaveBeenCalled();
  });

  it('does not compact when both promptTokens and estimate are below threshold', async () => {
    const toolCall: ToolCall = {
      id: 'tc1',
      type: 'function',
      function: { name: 'bash', arguments: '{"command":"status --task \\"t\\" --done \\"d\\" --remaining \\"none\\" --complete"}' },
    };
    const provider = createMockProvider([
      { content: '', toolCalls: [toolCall] },
      { content: 'Done.' },
    ]);

    const context = createMockContext();
    context.getTokenEstimate = () => 5000;
    context.needsCompaction = (tokenCount: number) => tokenCount >= 80000;

    const toolResult: ToolResult = {
      tool_call_id: 'tc1',
      content: 'ok',
      success: true,
      signals: { statusComplete: true, statusResult: { task: 't', done: 'd', remaining: 'none', complete: true, hasExplicitFlag: true } },
    };
    const executor = createMockExecutor(new Map([['tc1', toolResult]]));
    const progress = createMockProgress();
    const cost = createMockCost();

    const loop = new AgentLoop({
      config: defaultConfig(),
      provider,
      executor,
      context,
      progress,
      cost,
    });

    await loop.run('Build something');
    expect(context.compact).not.toHaveBeenCalled();
  });
});
