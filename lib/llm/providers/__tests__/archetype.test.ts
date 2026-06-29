import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProviderArchetype, getAllProviders } from '@/lib/llm/providers/registry';
import { saveCustomProvider, removeCustomProvider } from '@/lib/llm/providers/custom-providers';

function stubBrowserStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {} as unknown as Window);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  });
}
beforeEach(stubBrowserStorage);
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getProviderArchetype', () => {
  it('classifies providers from existing flags', () => {
    expect(getProviderArchetype('openrouter')).toBe('aggregator');
    expect(getProviderArchetype('ollama')).toBe('local');             // isLocal
    expect(getProviderArchetype('openai-codex')).toBe('subscription'); // usesOAuth + codex
    expect(getProviderArchetype('anthropic')).toBe('cloud');
  });

  it('classifies custom providers as custom', () => {
    saveCustomProvider('my-custom', {
      id: 'my-custom',
      name: 'My Custom',
      description: 'Test custom provider',
      apiKeyRequired: true,
      baseUrl: 'https://example.com/v1',
      supportsModelDiscovery: true,
      supportsFunctions: true,
      supportsStreaming: true,
    });
    expect(getProviderArchetype('my-custom')).toBe('custom');
    expect(getAllProviders().some((p) => p.id === 'my-custom')).toBe(true);
    removeCustomProvider('my-custom');
  });
});
