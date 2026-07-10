import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { reconcileActiveProviderIfConnected } from '@/lib/llm/models/global-auto-assign';
import { isProjectProviderReady } from '@/lib/llm/models/project-assignment';
import type { ModelTemplate } from '@/lib/llm/models/assignment';
import type { ProviderId } from '@/lib/llm/providers/types';

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

function seedGlobalTemplate(agentProvider: ProviderId, agentModel: string): void {
  const tpl: ModelTemplate = {
    id: 'tpl1',
    name: 'T',
    builtin: false,
    assignment: {
      agent: { provider: agentProvider, model: agentModel },
      imageGen: null,
      voiceInput: null,
      autoCompact: false,
      compactLimit: null,
    },
  };
  configManager.saveModelTemplate(tpl);
  configManager.setDefaultTemplateId('tpl1');
}

describe('reconcileActiveProviderIfConnected', () => {
  it('repoints an unready active agent onto a genuinely connected provider (the issue #17 case)', async () => {
    // Active agent points at a keyless provider (as a pre-global migration can leave it)...
    seedGlobalTemplate('anthropic', 'claude-x');
    // ...while another provider IS actually connected.
    configManager.setProviderApiKey('openrouter', 'sk-test');
    expect(isProjectProviderReady()).toBe(false);

    await reconcileActiveProviderIfConnected();

    expect(isProjectProviderReady()).toBe(true);
  });

  it('prefers the globally selected provider when it is connected', async () => {
    seedGlobalTemplate('anthropic', 'claude-x');
    configManager.setProviderApiKey('openrouter', 'sk-test');
    configManager.setSelectedProvider('openrouter');

    await reconcileActiveProviderIfConnected();

    expect(configManager.getSelectedProvider()).toBe('openrouter');
    expect(isProjectProviderReady()).toBe(true);
  });

  it('is a no-op for a genuine new user with nothing connected', async () => {
    seedGlobalTemplate('anthropic', 'claude-x');
    expect(isProjectProviderReady()).toBe(false);

    await reconcileActiveProviderIfConnected();

    // Left as-is so the onboarding UI (HF sign-in button) still shows.
    expect(isProjectProviderReady()).toBe(false);
  });

  it('does not touch an already-ready active agent', async () => {
    configManager.setProviderApiKey('anthropic', 'sk-test');
    seedGlobalTemplate('anthropic', 'claude-x');
    configManager.setDefaultTemplateId('tpl1');

    await reconcileActiveProviderIfConnected();

    expect(configManager.getDefaultTemplateId()).toBe('tpl1');
  });
});
