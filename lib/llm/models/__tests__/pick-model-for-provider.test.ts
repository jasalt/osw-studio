import { describe, it, expect } from 'vitest';
import { pickModelForProvider } from '../project-assignment';

describe('pickModelForProvider', () => {
  it('returns the default when it is in the available list', () => {
    expect(pickModelForProvider('b', ['a', 'b', 'c'])).toBe('b');
  });

  it('returns the first available id when the default is not in the list', () => {
    expect(pickModelForProvider('z', ['a', 'b', 'c'])).toBe('a');
  });

  it('falls back to the default when the list is empty', () => {
    expect(pickModelForProvider('only-default', [])).toBe('only-default');
  });

  it('returns empty string when both list and default are empty', () => {
    expect(pickModelForProvider('', [])).toBe('');
  });
});
