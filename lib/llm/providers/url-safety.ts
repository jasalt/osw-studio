const BLOCKED_EXACT = new Set(['localhost', '0.0.0.0', '::1', '[::1]']);

/** True if the host literal is loopback/private/link-local/internal. */
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_EXACT.has(host.toLowerCase()) || BLOCKED_EXACT.has(h)) return true;
  if (h.endsWith('.internal') || h.endsWith('.local')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]); const b = Number(m[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  // IPv6 link-local (fe80::/10) and unique-local (fc00::/7). Gate on ':' so a
  // public hostname like "fc2.com" or "fdic.gov" isn't mistaken for an IPv6 literal.
  if (h.includes(':') && (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd'))) return true;
  return false;
}

/**
 * Validate a user-supplied API base URL before the server fetches it.
 * Throws on non-http(s) schemes or private/loopback/link-local hosts.
 * NOTE: literal-host check only — does not resolve DNS, so DNS-rebinding is a
 * residual risk handled at the network layer on the gateway.
 */
export function assertPublicHttpUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('Invalid endpoint URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Endpoint must use http(s)');
  }
  if (isBlockedHost(u.hostname)) {
    throw new Error('Endpoint host is not allowed');
  }
  return raw;
}
