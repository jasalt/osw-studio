/**
 * Provider view — renders a message history the way the API route will
 * actually send it to the provider: reasoning replay policy applied for the
 * given model, tool-call arguments sanitized. Operates on a deep copy;
 * used by the debug panel's Messages tab.
 */

import type { Message } from './core/types';
import { applyReasoningReplayPolicy, ReplayMessage } from './reasoning-replay';

export function buildProviderView(messages: Message[], model: string): Message[] {
  const view: Message[] = JSON.parse(JSON.stringify(messages));

  applyReasoningReplayPolicy(view as unknown as ReplayMessage[], model);

  // Mirror the route's tool-argument sanitization (invalid JSON → '{}')
  for (const msg of view) {
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.function?.arguments) {
          try { JSON.parse(tc.function.arguments); } catch {
            tc.function.arguments = '{}';
          }
        }
      }
    }
  }

  return view;
}
