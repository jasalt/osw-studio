import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { isProviderConnected, getConnectedProviders, hasAnyConnectedProvider } from '@/lib/llm/providers/connection-status';
import type { ProviderModel } from '@/lib/llm/providers/types';
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

const MODELS: ProviderModel[] = [{ id: 'm/1', name: 'm1', contextLength: 1000 } as ProviderModel];

describe('isProviderConnected', () => {
  it('treats a stored API key as connected', () => {
    configManager.setProviderApiKey('openrouter', 'sk-test');
    expect(isProviderConnected('openrouter')).toBe(true);
  });

  it('does NOT treat cached models alone as connected for a cloud provider', () => {
    // HuggingFace exposes a public model list that caches without auth — caching it
    // must not make it appear connected (regression: false "connected" in incognito).
    configManager.setCachedModels('huggingface', MODELS);
    expect(configManager.getCachedModels('huggingface')).toBeTruthy();
    expect(isProviderConnected('huggingface')).toBe(false);
  });

  it('treats cached models as connected for a local provider (reaching it is the connection)', () => {
    configManager.setCachedModels('ollama', MODELS);
    expect(isProviderConnected('ollama')).toBe(true);
  });
});

describe('getConnectedProviders / hasAnyConnectedProvider', () => {
  it('reports nothing connected when only a cloud provider has cached models', () => {
    configManager.setCachedModels('huggingface', MODELS);
    expect(getConnectedProviders()).not.toContain('huggingface');
    expect(hasAnyConnectedProvider()).toBe(false);
  });

  it('reports connected once a key is set', () => {
    configManager.setProviderApiKey('anthropic', 'sk-test');
    expect(getConnectedProviders()).toContain('anthropic');
    expect(hasAnyConnectedProvider()).toBe(true);
  });

  it('treats a custom provider with a key as connected', () => {
    saveCustomProvider('custom-keyed', {
      id: 'custom-keyed',
      name: 'Custom Keyed',
      description: 'Test',
      apiKeyRequired: true,
      baseUrl: 'https://example.com/v1',
      supportsModelDiscovery: true,
      supportsFunctions: true,
      supportsStreaming: true,
    });
    configManager.setProviderApiKey('custom-keyed', 'sk-test');
    expect(isProviderConnected('custom-keyed')).toBe(true);
    expect(getConnectedProviders()).toContain('custom-keyed');
    removeCustomProvider('custom-keyed');
  });

  it('treats a custom provider with optional key as connected once models are cached', () => {
    saveCustomProvider('custom-optional', {
      id: 'custom-optional',
      name: 'Custom Optional',
      description: 'Test',
      apiKeyRequired: false,
      baseUrl: 'https://example.com/v1',
      supportsModelDiscovery: true,
      supportsFunctions: true,
      supportsStreaming: true,
    });
    expect(isProviderConnected('custom-optional')).toBe(false);
    configManager.setCachedModels('custom-optional', MODELS);
    expect(isProviderConnected('custom-optional')).toBe(true);
    removeCustomProvider('custom-optional');
  });
});
