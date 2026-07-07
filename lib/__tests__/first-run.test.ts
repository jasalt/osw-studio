import { describe, it, expect } from 'vitest';
import { shouldAutoCreateFirstProject } from '../first-run';

describe('shouldAutoCreateFirstProject', () => {
  it('returns true for a fresh visitor with no params and no projects', () => {
    expect(shouldAutoCreateFirstProject({ search: '', projectCount: 0 })).toBe(true);
  });

  it('returns false when the user already has projects', () => {
    expect(shouldAutoCreateFirstProject({ search: '', projectCount: 2 })).toBe(false);
  });

  it('returns false when a specific project is targeted', () => {
    expect(shouldAutoCreateFirstProject({ search: '?project=abc', projectCount: 0 })).toBe(false);
  });

  it('returns false during an OAuth return (?code=)', () => {
    expect(shouldAutoCreateFirstProject({ search: '?code=xyz', projectCount: 0 })).toBe(false);
  });

  it('returns false when a doc is targeted', () => {
    expect(shouldAutoCreateFirstProject({ search: '?doc=whats-new', projectCount: 0 })).toBe(false);
  });

  it('returns false when settings is targeted', () => {
    expect(shouldAutoCreateFirstProject({ search: '?settings=1', projectCount: 0 })).toBe(false);
  });

  it('returns false on a failed OAuth return (?error=, no code)', () => {
    expect(shouldAutoCreateFirstProject({ search: '?error=access_denied', projectCount: 0 })).toBe(false);
  });

  it('returns false for an empty-valued param (has() still matches)', () => {
    expect(shouldAutoCreateFirstProject({ search: '?project=', projectCount: 0 })).toBe(false);
  });

  it('returns false when multiple relevant params are combined', () => {
    expect(shouldAutoCreateFirstProject({ search: '?code=x&doc=y', projectCount: 0 })).toBe(false);
  });
});
