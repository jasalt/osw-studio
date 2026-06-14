import { describe, it, expect } from 'vitest';
import { buildCompletionFeedback, summarizeCompletion, type ItemCheckResult } from '../completion';
import type { InterviewItem } from '../types';

const items: InterviewItem[] = [
  { id: 'a', elicit: 'The company name.', completion: [], required: true },
  { id: 'b', elicit: 'The audience.', completion: [] },
  { id: 'c', elicit: 'Optional assets.', completion: [], required: false },
];

function res(itemId: string, passed: boolean, reason?: string): ItemCheckResult {
  return { itemId, passed, reason };
}

describe('buildCompletionFeedback', () => {
  it('returns null when all required items pass', () => {
    expect(buildCompletionFeedback(items, [res('a', true), res('b', true)])).toBeNull();
  });

  it('ignores optional items that fail', () => {
    expect(
      buildCompletionFeedback(items, [res('a', true), res('b', true), res('c', false, 'no assets')])
    ).toBeNull();
  });

  it('reports unmet required items with their elicit text and reason', () => {
    const r = buildCompletionFeedback(items, [res('a', true), res('b', false, 'audience missing')]);
    expect(r).not.toBeNull();
    expect(r).toContain('The audience.');
    expect(r).toContain('audience missing');
    expect(r).not.toContain('The company name.');
  });

  it('fails closed when a required item has no result at all', () => {
    const r = buildCompletionFeedback(items, [res('a', true)]);
    expect(r).not.toBeNull();
    expect(r).toContain('The audience.');
  });

  it('treats an item as unmet if any of its results failed', () => {
    const r = buildCompletionFeedback(items, [
      res('a', true),
      res('b', true),
      res('b', false, 'second check failed'),
    ]);
    expect(r).not.toBeNull();
    expect(r).toContain('The audience.');
  });
});

describe('summarizeCompletion', () => {
  it('reports required items with passed/reason and excludes optional items', () => {
    const s = summarizeCompletion(items, [res('a', true), res('b', false, 'missing')]);
    expect(s.map(x => x.id)).toEqual(['a', 'b']); // optional 'c' excluded
    expect(s.find(x => x.id === 'a')!.passed).toBe(true);
    const b = s.find(x => x.id === 'b')!;
    expect(b.passed).toBe(false);
    expect(b.reason).toBe('missing');
    expect(b.elicit).toBe('The audience.');
  });

  it('marks a required item with no results as not passed', () => {
    const s = summarizeCompletion(items, [res('a', true)]);
    expect(s.find(x => x.id === 'b')!.passed).toBe(false);
  });
});
