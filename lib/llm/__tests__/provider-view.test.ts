import { describe, it, expect } from 'vitest';
import { buildProviderView } from '../provider-view';
import type { Message } from '../core/types';

describe('buildProviderView', () => {
  it('applies the reasoning replay policy for the given model without mutating the input', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: '',
        reasoning_details: [{ type: 'reasoning.text', text: 'Thinking about it.' }],
      },
    ];

    const view = buildProviderView(messages, 'qwen/qwen3.6-35b-a3b');

    expect(view[1].content).toBe('Thinking about it.');
    expect(view[1].reasoning_details).toBeUndefined();
    // input untouched
    expect(messages[1].content).toBe('');
    expect(messages[1].reasoning_details).toHaveLength(1);
  });

  it('sanitizes invalid tool-call arguments like the API route does', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          { id: 'a', type: 'function', function: { name: 'bash', arguments: '{"command": "ls' } },
          { id: 'b', type: 'function', function: { name: 'bash', arguments: '{"command":"pwd"}' } },
        ],
      },
    ];

    const view = buildProviderView(messages, 'qwen/qwen3.6-35b-a3b');

    expect(view[0].tool_calls![0].function.arguments).toBe('{}');
    expect(view[0].tool_calls![1].function.arguments).toBe('{"command":"pwd"}');
    expect(messages[0].tool_calls![0].function.arguments).toBe('{"command": "ls');
  });

  it('keeps reasoning_content for replay-required models', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: '',
        reasoning_details: [{ type: 'reasoning.text', text: 'Prior thinking.' }],
      },
    ];

    const view = buildProviderView(messages, 'deepseek/deepseek-chat-v4');

    expect((view[0] as unknown as { reasoning_content?: string }).reasoning_content).toBe('Prior thinking.');
    expect(view[0].content).toBe('');
  });
});
