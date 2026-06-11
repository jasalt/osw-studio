import { describe, it, expect } from 'vitest';
import { consolidateSystemMessages } from '../consolidate-system-messages';
import type { LLMMessage } from '../types';

describe('consolidateSystemMessages', () => {
  it('merges scattered system messages into a single one at position 0', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'First instructions.' },
      { role: 'user', content: 'hi' },
      { role: 'system', content: 'Mid-conversation instructions.' },
      { role: 'assistant', content: 'hello' },
    ];

    const out = consolidateSystemMessages(messages);

    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ role: 'system', content: 'First instructions.\n\nMid-conversation instructions.' });
    expect(out[1]).toEqual({ role: 'user', content: 'hi' });
    expect(out[2]).toEqual({ role: 'assistant', content: 'hello' });
  });

  it('leaves a conversation with a single leading system message structurally unchanged', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
    ];

    const out = consolidateSystemMessages(messages);

    expect(out).toEqual(messages);
  });

  it('handles conversations without system messages', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];

    expect(consolidateSystemMessages(messages)).toEqual(messages);
  });

  it('extracts text from content-block system messages and drops empty ones', () => {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: [
          { type: 'text', text: 'Block instructions.' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,x' } },
        ],
      },
      { role: 'system', content: '' },
      { role: 'user', content: 'hi' },
    ];

    const out = consolidateSystemMessages(messages);

    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ role: 'system', content: 'Block instructions.' });
    expect(out[1]).toEqual({ role: 'user', content: 'hi' });
  });

  it('does not mutate the input array', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'system', content: 'late system' },
    ];
    const snapshot = JSON.parse(JSON.stringify(messages));

    consolidateSystemMessages(messages);

    expect(messages).toEqual(snapshot);
  });
});
