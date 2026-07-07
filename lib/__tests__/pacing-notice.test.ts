import { describe, it, expect } from 'vitest';
import { shouldShowPacingNotice, type PacingToolItem } from '../pacing-notice';

const NOW = 1_000_000;
const alwaysWrite = () => true;
const neverWrite = () => false;

function item(overrides: Partial<PacingToolItem> = {}): PacingToolItem {
  return {
    type: 'tool',
    timestamp: NOW - 31_000,
    status: 'executing',
    name: 'bash',
    command: 'cat > /index.html',
    ...overrides,
  };
}

describe('shouldShowPacingNotice', () => {
  it('returns true for a write executing 31s', () => {
    expect(shouldShowPacingNotice([item()], NOW, false, alwaysWrite)).toBe(true);
  });

  it('returns false for a write executing only 10s', () => {
    expect(
      shouldShowPacingNotice([item({ timestamp: NOW - 10_000 })], NOW, false, alwaysWrite)
    ).toBe(false);
  });

  it('returns false for a completed write after 31s', () => {
    expect(
      shouldShowPacingNotice([item({ status: 'completed' })], NOW, false, alwaysWrite)
    ).toBe(false);
  });

  it('returns false for a non-write executing 31s', () => {
    expect(shouldShowPacingNotice([item()], NOW, false, neverWrite)).toBe(false);
  });

  it('returns false when dismissed even with a qualifying write', () => {
    expect(shouldShowPacingNotice([item()], NOW, true, alwaysWrite)).toBe(false);
  });

  it('returns true for a pending (not yet executing) write after 31s', () => {
    expect(
      shouldShowPacingNotice([item({ status: 'pending' })], NOW, false, alwaysWrite)
    ).toBe(true);
  });

  it('returns false for an empty items array', () => {
    expect(shouldShowPacingNotice([], NOW, false, alwaysWrite)).toBe(false);
  });

  it('returns false at the exact 30s boundary (comparison is strictly greater than)', () => {
    expect(
      shouldShowPacingNotice([item({ timestamp: NOW - 30_000 })], NOW, false, alwaysWrite)
    ).toBe(false);
  });

  it('returns true when only one of several items is a qualifying write', () => {
    const items: PacingToolItem[] = [
      item({ status: 'completed', command: 'ls /', name: 'bash' }),
      item({ status: 'executing', timestamp: NOW - 5_000, command: 'ls /', name: 'bash' }),
      item({ status: 'executing', timestamp: NOW - 31_000, command: 'cat > /index.html', name: 'bash' }),
    ];
    expect(
      shouldShowPacingNotice(items, NOW, false, (it) => it.command?.startsWith('cat >') ?? false)
    ).toBe(true);
  });
});
