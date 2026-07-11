import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { hasPublishScope } from '@/lib/auth/hf-auth';

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', { dispatchEvent: () => true } as any);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  });
}
beforeEach(stubStorage);
afterEach(() => vi.unstubAllGlobals());

describe('hasPublishScope', () => {
  it('is false with no HF auth', () => {
    expect(hasPublishScope()).toBe(false);
  });
  it('is false when an OAuth token records scopes without contribute-repos', () => {
    configManager.setHFAuth({ access_token: 't', scopes: 'openid profile inference-api' });
    expect(hasPublishScope()).toBe(false);
  });
  it('is true when an OAuth token records the contribute-repos scope', () => {
    configManager.setHFAuth({ access_token: 't', scopes: 'openid profile contribute-repos' });
    expect(hasPublishScope()).toBe(true);
  });
  it('is true for a pasted token that records no scopes (assume permitted; 403 surfaces otherwise)', () => {
    configManager.setHFAuth({ access_token: 't' });
    expect(hasPublishScope()).toBe(true);
  });
});
