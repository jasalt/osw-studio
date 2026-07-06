/**
 * Shared fixed-window rate limiter for the web proxy routes.
 * In-memory, per-process. Keyed by workspace session or client IP.
 */
const WINDOW_MS = 60_000;
const LIMIT = 60;
const MAX_KEYS = 10_000;
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  if (hits.size > MAX_KEYS) hits.clear(); // crude memory bound
  const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
