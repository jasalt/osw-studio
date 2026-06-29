import { describe, it, expect } from 'vitest';
import { assertPublicHttpUrl, isBlockedHost } from '@/lib/llm/providers/url-safety';

describe('isBlockedHost', () => {
  it('blocks loopback, private, link-local, and metadata hosts', () => {
    for (const h of ['localhost', '127.0.0.1', '0.0.0.0', '10.1.2.3',
                      '192.168.0.5', '172.16.0.1', '169.254.169.254',
                      '[::1]', 'foo.internal', 'metadata.google.internal']) {
      expect(isBlockedHost(h)).toBe(true);
    }
  });
  it('blocks IPv6 link-local and unique-local literals', () => {
    for (const h of ['fc00::1', '[fc00::1]', 'fd12:3456::1', 'fe80::1']) {
      expect(isBlockedHost(h)).toBe(true);
    }
  });
  it('allows ordinary public hosts, including domains that start with fc/fd', () => {
    for (const h of ['opencode.ai', 'api.openai.com', 'example.com', 'fc2.com', 'fdic.gov']) {
      expect(isBlockedHost(h)).toBe(false);
    }
  });
});

describe('assertPublicHttpUrl', () => {
  it('rejects non-http(s) schemes', () => {
    expect(() => assertPublicHttpUrl('file:///etc/passwd')).toThrow();
    expect(() => assertPublicHttpUrl('ftp://example.com')).toThrow();
  });
  it('rejects private/loopback hosts', () => {
    expect(() => assertPublicHttpUrl('http://169.254.169.254/latest')).toThrow();
  });
  it('returns the normalized URL for public https endpoints', () => {
    expect(assertPublicHttpUrl('https://opencode.ai/zen/go/v1')).toBe('https://opencode.ai/zen/go/v1');
  });
});
