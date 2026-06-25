import { describe, it, expect } from 'vitest';
import { getProviderArchetype } from '@/lib/llm/providers/registry';

describe('getProviderArchetype', () => {
  it('classifies providers from existing flags', () => {
    expect(getProviderArchetype('openrouter')).toBe('aggregator');
    expect(getProviderArchetype('ollama')).toBe('local');             // isLocal
    expect(getProviderArchetype('openai-codex')).toBe('subscription'); // usesOAuth + codex
    expect(getProviderArchetype('anthropic')).toBe('cloud');
  });
});
