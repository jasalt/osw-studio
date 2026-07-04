/**
 * Once-per-page-load guard for the `session_start` event.
 *
 * In server mode the telemetry bootstrap (PageWrapper) remounts on every route
 * navigation, but a session must be counted once per page load, not once per
 * navigation. This module-level flag survives client-side navigations, so
 * `markSessionStartedOnce()` returns true exactly once and false thereafter.
 */

let started = false;

/** Returns true the first time it is called per module lifetime, false after. */
export function markSessionStartedOnce(): boolean {
  if (started) return false;
  started = true;
  return true;
}

/** Test-only: reset the guard so each test case starts fresh. */
export function __resetSessionGuardForTests(): void {
  started = false;
}
