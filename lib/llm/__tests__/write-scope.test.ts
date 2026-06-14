import { describe, it, expect } from 'vitest';
import { isPathWithinScope, writeTargets, checkWriteScope } from '../write-scope';

describe('isPathWithinScope', () => {
  it('allows paths under the scope', () => {
    expect(isPathWithinScope('/.interviews/', '/.interviews/a.md')).toBe(true);
    expect(isPathWithinScope('/.interviews/', '/.interviews/sub/b.md')).toBe(true);
  });

  it('denies paths outside the scope', () => {
    expect(isPathWithinScope('/.interviews/', '/index.html')).toBe(false);
    expect(isPathWithinScope('/.interviews/', '/styles/app.css')).toBe(false);
  });

  it('denies a sibling prefix that is not actually inside the scope dir', () => {
    expect(isPathWithinScope('/.interviews/', '/.interviewsX/a.md')).toBe(false);
  });

  it('rejects any path containing ..', () => {
    expect(isPathWithinScope('/.interviews/', '/.interviews/../index.html')).toBe(false);
    expect(isPathWithinScope('/.interviews/', '/.interviews/../../etc/x')).toBe(false);
  });

  it('normalizes a scope given without a trailing slash', () => {
    expect(isPathWithinScope('/.interviews', '/.interviews/a.md')).toBe(true);
    expect(isPathWithinScope('/.interviews', '/index.html')).toBe(false);
  });

  it('allows the scope directory itself (e.g. mkdir of the scope dir)', () => {
    expect(isPathWithinScope('/.interviews/', '/.interviews')).toBe(true);
    expect(isPathWithinScope('/.interviews', '/.interviews')).toBe(true);
  });
});

describe('writeTargets', () => {
  it('returns the redirect target for cat/echo > and >>', () => {
    expect(writeTargets(['cat', '>', '/index.html'])).toEqual(['/index.html']);
    expect(writeTargets(['echo', 'hi', '>>', '/a.txt'])).toEqual(['/a.txt']);
  });

  it('returns the first path arg for ss (skipping flags)', () => {
    expect(writeTargets(['ss', '/foo.md'])).toEqual(['/foo.md']);
    expect(writeTargets(['ss', '--entity', '/foo.md'])).toEqual(['/foo.md']);
  });

  it('returns the file arg for sed -i', () => {
    expect(writeTargets(['sed', '-i', 's/a/b/', '/foo.md'])).toEqual(['/foo.md']);
  });

  it('returns the path for touch and mkdir', () => {
    expect(writeTargets(['touch', '/foo.md'])).toEqual(['/foo.md']);
    expect(writeTargets(['mkdir', '-p', '/a/b'])).toEqual(['/a/b']);
  });

  it('returns the destination for cp and mv', () => {
    expect(writeTargets(['cp', '/src.md', '/dst.md'])).toEqual(['/dst.md']);
    expect(writeTargets(['mv', '/src.md', '/dst.md'])).toEqual(['/dst.md']);
  });

  it('normalizes a relative target to an absolute path', () => {
    expect(writeTargets(['cat', '>', 'feature.md'])).toEqual(['/feature.md']);
  });

  it('returns [] for read commands', () => {
    expect(writeTargets(['cat', '/foo.md'])).toEqual([]);
    expect(writeTargets(['rg', 'pattern', '/'])).toEqual([]);
  });

  it('returns null (fail-closed) for a write whose target cannot be determined', () => {
    expect(writeTargets(['cat', '>'])).toBeNull();
    expect(writeTargets(['ss'])).toBeNull();
  });
});

describe('checkWriteScope', () => {
  it('allows everything when no scope is set', () => {
    expect(checkWriteScope(['cat', '>', '/index.html'], undefined).allowed).toBe(true);
  });

  it('allows reads anywhere even under a scope', () => {
    expect(checkWriteScope(['cat', '/index.html'], '/.interviews/').allowed).toBe(true);
    expect(checkWriteScope(['rg', 'x', '/'], '/.interviews/').allowed).toBe(true);
  });

  it('allows writes inside the scope', () => {
    expect(checkWriteScope(['cat', '>', '/.interviews/a.md'], '/.interviews/').allowed).toBe(true);
    expect(checkWriteScope(['ss', '/.interviews/a.md'], '/.interviews/').allowed).toBe(true);
  });

  it('allows mkdir of the scope directory itself', () => {
    expect(checkWriteScope(['mkdir', '-p', '/.interviews'], '/.interviews/').allowed).toBe(true);
  });

  it('denies writes outside the scope, with a reason', () => {
    const r = checkWriteScope(['cat', '>', '/index.html'], '/.interviews/');
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('/.interviews/');
  });

  it('denies fail-closed when a write target cannot be parsed', () => {
    const r = checkWriteScope(['ss'], '/.interviews/');
    expect(r.allowed).toBe(false);
  });
});
