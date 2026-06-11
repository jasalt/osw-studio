/**
 * Merge all system messages into a single message at position 0.
 *
 * Some providers reject system messages at any position other than the first
 * (e.g. Ambient on OpenRouter). Compaction summaries and re-imported histories
 * can leave system messages mid-conversation; this normalizes the shape before
 * the request goes out. Returns a new array — the input is not mutated.
 */

import type { LLMMessage, ContentBlock, TextContentBlock } from './types';

function textOf(content: string | ContentBlock[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b): b is TextContentBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

export function consolidateSystemMessages(messages: LLMMessage[]): LLMMessage[] {
  const systemParts: string[] = [];
  const nonSystem: LLMMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = textOf(msg.content);
      if (text) systemParts.push(text);
    } else {
      nonSystem.push(msg);
    }
  }

  if (systemParts.length === 0) return nonSystem;

  return [
    { role: 'system', content: systemParts.join('\n\n') },
    ...nonSystem,
  ];
}
