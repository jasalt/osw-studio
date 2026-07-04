import { describe, it, expect, beforeEach } from 'vitest';
import { markSessionStartedOnce, __resetSessionGuardForTests } from '../session-guard';

describe('markSessionStartedOnce', () => {
  beforeEach(() => __resetSessionGuardForTests());

  it('returns true only on the first call and false thereafter', () => {
    expect(markSessionStartedOnce()).toBe(true);
    expect(markSessionStartedOnce()).toBe(false);
    expect(markSessionStartedOnce()).toBe(false);
  });

  it('models exactly one session_start across many bootstrap remounts', () => {
    // Each server-mode route navigation remounts the bootstrap and calls the
    // guard; the session must be counted once, not once per navigation.
    let sessionStarts = 0;
    for (let i = 0; i < 5; i++) {
      if (markSessionStartedOnce()) sessionStarts++;
    }
    expect(sessionStarts).toBe(1);
  });
});
