import { describe, it, expect } from 'vitest';
import { suggestSpaceSlug, isValidSpaceSlug } from '@/lib/publishing/hf-slug';

describe('suggestSpaceSlug', () => {
  it('lowercases, replaces spaces/punctuation with hyphens, trims separators', () => {
    expect(suggestSpaceSlug('My Cool Site!')).toBe('my-cool-site');
    expect(suggestSpaceSlug('  Spaces  &  Symbols  ')).toBe('spaces-symbols');
    expect(suggestSpaceSlug('already-ok')).toBe('already-ok');
  });
  it('collapses repeats and strips leading/trailing hyphens', () => {
    expect(suggestSpaceSlug('--a__b..c--')).toBe('a-b-c');
  });
  it('falls back to a default when nothing usable remains', () => {
    expect(suggestSpaceSlug('!!!')).toBe('my-site');
    expect(suggestSpaceSlug('')).toBe('my-site');
  });
  it('caps length at 96 chars', () => {
    expect(suggestSpaceSlug('a'.repeat(200)).length).toBe(96);
  });
});

describe('isValidSpaceSlug', () => {
  it('accepts lowercase alphanumerics and single hyphens', () => {
    expect(isValidSpaceSlug('my-cool-site')).toBe(true);
    expect(isValidSpaceSlug('abc123')).toBe(true);
  });
  it('rejects empty, leading/trailing hyphen, spaces, uppercase, other punctuation', () => {
    expect(isValidSpaceSlug('')).toBe(false);
    expect(isValidSpaceSlug('-x')).toBe(false);
    expect(isValidSpaceSlug('x-')).toBe(false);
    expect(isValidSpaceSlug('Has Space')).toBe(false);
    expect(isValidSpaceSlug('UPPER')).toBe(false);
    expect(isValidSpaceSlug('a/b')).toBe(false);
  });
});
