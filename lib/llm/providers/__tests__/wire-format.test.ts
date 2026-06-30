import { describe, it, expect } from 'vitest';
import { resolveWireFormat } from '@/lib/llm/providers/wire-format';

describe('resolveWireFormat', () => {
  it('keeps built-in anthropic/gemini providers on their own format', () => {
    expect(resolveWireFormat('anthropic', 'claude-x')).toBe('anthropic');
    expect(resolveWireFormat('gemini', 'gemini-2.5-flash')).toBe('gemini');
  });
  it('routes Opencode Go minimax/qwen models to anthropic', () => {
    expect(resolveWireFormat('opencode-go', 'minimax-m2.7')).toBe('anthropic');
    expect(resolveWireFormat('opencode-go', 'minimax-m3')).toBe('anthropic');
    expect(resolveWireFormat('opencode-go', 'qwen3.7-plus')).toBe('anthropic');
    expect(resolveWireFormat('opencode-go', 'qwen3.5-plus')).toBe('anthropic');
  });
  it('routes other Opencode Go models to openai', () => {
    for (const m of ['glm-5.2', 'kimi-k2.6', 'deepseek-v4-pro', 'mimo-v2.5']) {
      expect(resolveWireFormat('opencode-go', m)).toBe('openai');
    }
  });
  it('defaults ordinary providers to openai', () => {
    expect(resolveWireFormat('openrouter', 'anything')).toBe('openai');
  });
});
