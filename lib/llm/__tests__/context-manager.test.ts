import { describe, it, expect, vi } from 'vitest';
import { ContextManagerImpl } from '../core/context-manager';
import type { ProviderAdapter, ParsedResponse, Message } from '../core/types';

function mockProvider(summaryText: string): ProviderAdapter {
  return {
    call: vi.fn().mockResolvedValue({ content: summaryText }),
    getModel: () => 'test-model',
    getProvider: () => 'test',
    supportsTools: () => true,
  };
}

const defaultConfig = {
  contextLength: 100000,
  threshold: 60000,
  recentKeepRatio: 0.2,
  summaryTokenRatio: 0.1,
  buildCompactionPrompt: (prev?: string) => prev ? `prev: ${prev}\nsummarize` : 'summarize',
};

// Config with small context for testing compaction triggers
const smallConfig = {
  contextLength: 1000,
  threshold: 500,
  recentKeepRatio: 0.2,
  summaryTokenRatio: 0.1,
  buildCompactionPrompt: (prev?: string) => prev ? `prev: ${prev}\nsummarize` : 'summarize',
};

describe('ContextManagerImpl', () => {
  it('adds user message', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addUserMessage('hello');
    const msgs = cm.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('hello');
  });

  it('adds assistant turn with tool calls', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    const response: ParsedResponse = {
      content: 'I will help',
      toolCalls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '{"cmd":"ls"}' } }],
    };
    cm.addAssistantTurn(response);
    const msgs = cm.getMessages();
    expect(msgs[0].role).toBe('assistant');
    expect(msgs[0].tool_calls).toHaveLength(1);
  });

  it('adds tool results', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addToolResults([{ tool_call_id: 'tc1', content: 'file.txt', success: true }]);
    const msgs = cm.getMessages();
    expect(msgs[0].role).toBe('tool');
    expect(msgs[0].tool_call_id).toBe('tc1');
  });

  it('imports messages', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addUserMessage('old message');
    const imported: Message[] = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'imported' },
    ];
    cm.importMessages(imported);
    expect(cm.getMessages()).toHaveLength(2);
    expect(cm.getMessages()[1].content).toBe('imported');
  });

  it('sets system prompt', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.setSystemPrompt('you are helpful');
    expect(cm.getMessages()[0]).toEqual({ role: 'system', content: 'you are helpful' });
    cm.setSystemPrompt('updated');
    expect(cm.getMessages()[0].content).toBe('updated');
    expect(cm.getMessages()).toHaveLength(1);
  });

  it('reports needsCompaction correctly', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    expect(cm.needsCompaction(50000)).toBe(false);
    expect(cm.needsCompaction(60000)).toBe(true);
    expect(cm.needsCompaction(70000)).toBe(true);
  });

  it('calls onMessageAdded hook', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    const hook = vi.fn();
    cm.onMessageAdded = hook;
    cm.addUserMessage('test');
    expect(hook).toHaveBeenCalledWith(expect.objectContaining({ role: 'user', content: 'test' }));
  });

  it('estimates token count', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addUserMessage('hello world'); // 11 chars -> ~3 tokens
    const estimate = cm.getTokenEstimate();
    expect(estimate).toBeGreaterThan(0);
    expect(estimate).toBe(Math.round(11 / 3.5));
  });

  it('estimates tokens for tool calls', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addAssistantTurn({
      content: 'ok',
      toolCalls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '{"cmd":"ls -la"}' } }],
    });
    const estimate = cm.getTokenEstimate();
    // content "ok" (2 chars) + args '{"cmd":"ls -la"}' (16 chars) = 18 / 3.5 ~ 5
    expect(estimate).toBe(Math.round(18 / 3.5));
  });

  it('compacts conversation via provider', async () => {
    const cm = new ContextManagerImpl(smallConfig);
    cm.setSystemPrompt('system prompt');
    // Add enough messages so there's something to compact (needs to exceed recent budget)
    for (let i = 0; i < 10; i++) {
      cm.addUserMessage(`user msg ${i} - ${'x'.repeat(200)}`);
      cm.addAssistantTurn({ content: `response ${i} - ${'y'.repeat(200)}` });
    }
    const provider = mockProvider('Summary of conversation');
    await cm.compact(provider, { freshSystemPrompt: 'fresh system prompt' });
    const msgs = cm.getMessages();
    // First message should be the fresh system prompt
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toBe('fresh system prompt');
    // Should contain the summary somewhere
    expect(msgs.some(m => typeof m.content === 'string' && m.content.includes('Summary of conversation'))).toBe(true);
    // Should have called the provider
    expect(provider.call).toHaveBeenCalled();
  });

  it('compaction skips when too few messages', async () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.setSystemPrompt('system');
    cm.addUserMessage('only message');
    const provider = mockProvider('should not be called');
    await cm.compact(provider, { freshSystemPrompt: 'fresh' });
    // Provider should not be called
    expect(provider.call).not.toHaveBeenCalled();
    // Messages unchanged
    expect(cm.getMessages()).toHaveLength(2);
  });

  it('compaction includes project context when provided', async () => {
    const cm = new ContextManagerImpl(smallConfig);
    cm.setSystemPrompt('system');
    for (let i = 0; i < 10; i++) {
      cm.addUserMessage(`user msg ${i} - ${'x'.repeat(200)}`);
      cm.addAssistantTurn({ content: `response ${i} - ${'y'.repeat(200)}` });
    }
    const provider = mockProvider('Summary');
    await cm.compact(provider, { freshSystemPrompt: 'fresh', projectContext: 'file tree here' });
    const msgs = cm.getMessages();
    // Second message (user) should reference project context
    const contextMsg = msgs.find(m => m.role === 'user' && typeof m.content === 'string' && m.content.includes('file tree here'));
    expect(contextMsg).toBeDefined();
  });

  it('compaction increments count', async () => {
    const cm = new ContextManagerImpl(smallConfig);
    cm.setSystemPrompt('system');
    for (let i = 0; i < 10; i++) {
      cm.addUserMessage(`user msg ${i} - ${'x'.repeat(200)}`);
      cm.addAssistantTurn({ content: `response ${i} - ${'y'.repeat(200)}` });
    }
    const provider = mockProvider('Summary');
    expect(cm.getCompactionCount()).toBe(0);
    await cm.compact(provider, { freshSystemPrompt: 'fresh' });
    expect(cm.getCompactionCount()).toBe(1);
  });

  it('compaction fails gracefully on empty provider response', async () => {
    const cm = new ContextManagerImpl(smallConfig);
    cm.setSystemPrompt('system');
    for (let i = 0; i < 10; i++) {
      cm.addUserMessage(`user msg ${i} - ${'x'.repeat(200)}`);
      cm.addAssistantTurn({ content: `response ${i} - ${'y'.repeat(200)}` });
    }
    const provider = mockProvider('');
    const msgsBefore = cm.getMessages().length;
    await cm.compact(provider, { freshSystemPrompt: 'fresh' });
    // Messages should be unchanged (graceful failure)
    expect(cm.getMessages().length).toBe(msgsBefore);
  });

  it('repairs orphan tool calls', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    // Assistant with tool call but no matching tool result
    cm.addAssistantTurn({
      content: 'let me check',
      toolCalls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '{"cmd":"ls"}' } }],
    });
    // No tool result added for tc1
    cm.addUserMessage('next message');

    const sanitized = cm.getSanitizedMessages();
    // Should have: assistant, synthetic tool result for tc1, user
    const toolMsg = sanitized.find(m => m.role === 'tool' && m.tool_call_id === 'tc1');
    expect(toolMsg).toBeDefined();
    expect(toolMsg!.content).toContain('cancelled');
  });

  it('repairs tool calls with empty arguments', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addAssistantTurn({
      content: 'text content',
      toolCalls: [
        { id: 'tc1', type: 'function', function: { name: 'shell', arguments: '' } },
        { id: 'tc2', type: 'function', function: { name: 'shell', arguments: '{"cmd":"ls"}' } },
      ],
    });
    cm.addToolResults([{ tool_call_id: 'tc2', content: 'result', success: true }]);

    const sanitized = cm.getSanitizedMessages();
    // tc1 should be filtered out (empty args), tc2 kept
    const assistantMsg = sanitized.find(m => m.role === 'assistant');
    expect(assistantMsg?.tool_calls).toHaveLength(1);
    expect(assistantMsg?.tool_calls![0].id).toBe('tc2');
  });

  it('drops assistant message entirely when all tool calls have empty args and no content', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addAssistantTurn({
      content: '',
      toolCalls: [{ id: 'tc1', type: 'function', function: { name: 'shell', arguments: '' } }],
    });
    cm.addUserMessage('next');

    const sanitized = cm.getSanitizedMessages();
    // The empty assistant message should be dropped
    expect(sanitized.find(m => m.role === 'assistant')).toBeUndefined();
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].role).toBe('user');
  });

  it('handles multimodal content blocks in user message', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    const blocks = [
      { type: 'text' as const, text: 'describe this' },
      { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,abc' } },
    ];
    cm.addUserMessage(blocks);
    const msgs = cm.getMessages();
    expect(msgs[0].content).toEqual(blocks);
  });

  it('preserves reasoning_details on assistant turns', () => {
    const cm = new ContextManagerImpl(defaultConfig);
    cm.addAssistantTurn({
      content: 'thought about it',
      reasoningDetails: [{ type: 'thinking', text: 'internal reasoning' }],
    });
    const msgs = cm.getMessages();
    expect(msgs[0].reasoning_details).toHaveLength(1);
    expect(msgs[0].reasoning_details![0].text).toBe('internal reasoning');
  });
});
