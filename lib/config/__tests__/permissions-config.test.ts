import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';

function stubBrowserStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', { dispatchEvent: () => true } as unknown as Window);
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
afterEach(() => vi.unstubAllGlobals());

describe('permissions config', () => {
  it('permission mode defaults to ask and round-trips', () => {
    expect(configManager.getPermissionMode()).toBe('ask');
    configManager.setPermissionMode('auto');
    expect(configManager.getPermissionMode()).toBe('auto');
  });

  it('permission overrides round-trip and setPermissionOverride merges', () => {
    configManager.setPermissionOverride('search', 'allow');
    expect(configManager.getPermissionOverrides().search).toBe('allow');
    configManager.setPermissionOverride('rm', 'ask');
    expect(configManager.getPermissionOverrides()).toEqual({ search: 'allow', rm: 'ask' });
  });

  it('setPermissionOverrides replaces the whole map', () => {
    configManager.setPermissionOverride('search', 'allow');
    configManager.setPermissionOverrides({ cat: 'ask' });
    expect(configManager.getPermissionOverrides()).toEqual({ cat: 'ask' });
  });

  it('web search config round-trips and reports configured state', () => {
    expect(configManager.isWebSearchConfigured()).toBe(false);
    configManager.setWebSearchProvider('tavily');
    expect(configManager.isWebSearchConfigured()).toBe(false); // provider set, no key yet
    configManager.setWebSearchKey('tavily', 'tvly-x');
    expect(configManager.getWebSearchProvider()).toBe('tavily');
    expect(configManager.getWebSearchKey('tavily')).toBe('tvly-x');
    expect(configManager.isWebSearchConfigured()).toBe(true);
  });

  it('duckduckgo is configured without credentials', () => {
    configManager.setWebSearchProvider('duckduckgo');
    expect(configManager.isWebSearchConfigured()).toBe(true);
  });

  it('searxng is configured via url not key', () => {
    configManager.setWebSearchProvider('searxng');
    expect(configManager.isWebSearchConfigured()).toBe(false);
    configManager.setSearxngUrl('https://searx.example');
    expect(configManager.getSearxngUrl()).toBe('https://searx.example');
    expect(configManager.isWebSearchConfigured()).toBe(true);
  });

  it('setWebSearchProvider(null) clears the active provider', () => {
    configManager.setWebSearchProvider('tavily');
    expect(configManager.getWebSearchProvider()).toBe('tavily');
    configManager.setWebSearchProvider(null);
    expect(configManager.getWebSearchProvider()).toBeNull();
  });

  it('model picker collapsed groups default to empty and toggle', () => {
    expect(configManager.getCollapsedModelGroups()).toEqual([]);
    configManager.setModelGroupCollapsed('openrouter', true);
    expect(configManager.getCollapsedModelGroups()).toEqual(['openrouter']);
    configManager.setModelGroupCollapsed('anthropic', true);
    expect(configManager.getCollapsedModelGroups().sort()).toEqual(['anthropic', 'openrouter']);
    configManager.setModelGroupCollapsed('openrouter', false);
    expect(configManager.getCollapsedModelGroups()).toEqual(['anthropic']);
  });
});
