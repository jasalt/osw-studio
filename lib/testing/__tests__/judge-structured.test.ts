import { describe, it, expect } from 'vitest';
import { parseStructuredVerdicts, extractJudgeUsage } from '../judge';

describe('parseStructuredVerdicts', () => {
  it('parses per-item PASS/FAIL with reasons, in order', () => {
    const r = parseStructuredVerdicts('1: PASS\n2: FAIL - missing audience\n3: PASS', 3);
    expect(r).toHaveLength(3);
    expect(r[0].passed).toBe(true);
    expect(r[1].passed).toBe(false);
    expect(r[1].reasoning).toContain('audience');
    expect(r[2].passed).toBe(true);
  });

  it('handles ITEM prefixes, dot separators, and em-dashes', () => {
    const r = parseStructuredVerdicts('ITEM 1: FAIL — nope\n2. PASS', 2);
    expect(r[0].passed).toBe(false);
    expect(r[0].reasoning).toBe('nope');
    expect(r[1].passed).toBe(true);
  });

  it('does not confuse item 1 with item 10', () => {
    const r = parseStructuredVerdicts('10: FAIL - x\n1: PASS', 10);
    expect(r[0].passed).toBe(true);   // item 1
    expect(r[9].passed).toBe(false);  // item 10
  });

  it('fails closed when an item has no parseable verdict', () => {
    const r = parseStructuredVerdicts('1: PASS', 2);
    expect(r[1].passed).toBe(false);
    expect(r[1].reasoning).toBeTruthy();
  });

  it('returns empty for zero items', () => {
    expect(parseStructuredVerdicts('whatever', 0)).toEqual([]);
  });
});

describe('extractJudgeUsage', () => {
  it('parses OpenAI-compatible usage', () => {
    const u = extractJudgeUsage('openrouter', 'm', { usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } });
    expect(u).toEqual({ promptTokens: 100, completionTokens: 20, totalTokens: 120, model: 'm', provider: 'openrouter' });
  });

  it('parses Anthropic usage (input/output tokens)', () => {
    const u = extractJudgeUsage('anthropic', 'claude', { usage: { input_tokens: 80, output_tokens: 15 } });
    expect(u).toMatchObject({ promptTokens: 80, completionTokens: 15, totalTokens: 95, provider: 'anthropic' });
  });

  it('parses Gemini usage (usageMetadata)', () => {
    const u = extractJudgeUsage('gemini', 'g', { usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10, totalTokenCount: 60 } });
    expect(u).toMatchObject({ promptTokens: 50, completionTokens: 10, totalTokens: 60, provider: 'gemini' });
  });

  it('returns undefined when no usage is present', () => {
    expect(extractJudgeUsage('openrouter', 'm', {})).toBeUndefined();
    expect(extractJudgeUsage('gemini', 'g', { candidates: [] })).toBeUndefined();
  });
});
