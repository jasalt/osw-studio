import { describe, it, expect } from 'vitest';
import { applyReasoningReplayPolicy, requiresReasoningReplay, ReplayMessage } from '../reasoning-replay';

function reasoningMsg(overrides?: Partial<ReplayMessage>): ReplayMessage {
  return {
    role: 'assistant',
    content: '',
    reasoning_details: [
      { text: 'Let me check index.html first.' },
    ],
    ...overrides,
  };
}

describe('requiresReasoningReplay', () => {
  it('matches model families that need reasoning passed back', () => {
    expect(requiresReasoningReplay('deepseek/deepseek-chat-v4')).toBe(true);
    expect(requiresReasoningReplay('z-ai/glm-4.6')).toBe(true);
    expect(requiresReasoningReplay('minimax/minimax-m2')).toBe(true);
  });

  it('does not match other models', () => {
    expect(requiresReasoningReplay('qwen/qwen3.6-35b-a3b')).toBe(false);
    expect(requiresReasoningReplay('openai/gpt-5.2')).toBe(false);
    expect(requiresReasoningReplay('moonshotai/kimi-k2')).toBe(false);
  });
});

describe('applyReasoningReplayPolicy', () => {
  it('attaches reasoning_content for replay-required models (DeepSeek)', () => {
    const msg = reasoningMsg();
    applyReasoningReplayPolicy([msg], 'deepseek/deepseek-chat-v4');

    expect(msg.reasoning_content).toBe('Let me check index.html first.');
    expect(msg.content).toBe('');
    expect(msg.reasoning_details).toBeUndefined();
  });

  it('promotes reasoning to content for reasoning-only turns on non-replay models (Qwen)', () => {
    const msg = reasoningMsg();
    applyReasoningReplayPolicy([msg], 'qwen/qwen3.6-35b-a3b');

    expect(msg.content).toBe('Let me check index.html first.');
    expect(msg.reasoning_content).toBeUndefined();
    expect(msg.reasoning_details).toBeUndefined();
  });

  it('strips reasoning without promotion when the turn already has content', () => {
    const msg = reasoningMsg({ content: 'Here is my answer.' });
    applyReasoningReplayPolicy([msg], 'qwen/qwen3.6-35b-a3b');

    expect(msg.content).toBe('Here is my answer.');
    expect(msg.reasoning_content).toBeUndefined();
    expect(msg.reasoning_details).toBeUndefined();
  });

  it('strips reasoning without promotion when the turn has tool calls', () => {
    const msg = reasoningMsg({
      tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
    });
    applyReasoningReplayPolicy([msg], 'qwen/qwen3.6-35b-a3b');

    expect(msg.content).toBe('');
    expect(msg.tool_calls).toHaveLength(1);
    expect(msg.reasoning_content).toBeUndefined();
    expect(msg.reasoning_details).toBeUndefined();
  });

  it('leaves non-assistant messages and assistant messages without reasoning untouched', () => {
    const user = { role: 'user', content: 'hi' };
    const assistant = { role: 'assistant', content: 'hello' };
    applyReasoningReplayPolicy([user, assistant], 'qwen/qwen3.6-35b-a3b');

    expect(user).toEqual({ role: 'user', content: 'hi' });
    expect(assistant).toEqual({ role: 'assistant', content: 'hello' });
  });

  it('joins multiple reasoning detail blocks when promoting', () => {
    const msg = reasoningMsg({
      reasoning_details: [
        { text: 'Part one. ' },
        { text: 'Part two.' },
        {}, // signature-only block — no text
      ],
    });
    applyReasoningReplayPolicy([msg], 'qwen/qwen3.6-35b-a3b');

    expect(msg.content).toBe('Part one. Part two.');
  });
});
