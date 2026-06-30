import type { ProviderId } from './types';

export type WireFormat = 'openai' | 'anthropic' | 'gemini';

/**
 * The wire format a given model speaks. Opencode Go serves minimax-* and qwen* models in
 * Anthropic format (/messages) and the rest in OpenAI format (/chat/completions) on the
 * same base URL, so the format is per-model there. Built-in anthropic/gemini providers
 * keep their own format; everything else is OpenAI-compatible.
 */
export function resolveWireFormat(provider: ProviderId, model: string): WireFormat {
  if (provider === 'anthropic') return 'anthropic';
  if (provider === 'gemini') return 'gemini';
  if (provider === 'opencode-go') {
    const m = model.toLowerCase();
    if (m.startsWith('minimax-') || m.startsWith('qwen')) return 'anthropic';
    return 'openai';
  }
  return 'openai';
}
