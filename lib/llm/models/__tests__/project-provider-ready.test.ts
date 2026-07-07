import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { isProjectProviderReady, shouldAutoAssignAgent } from '@/lib/llm/models/project-assignment';
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

// Seed the GLOBAL active template's agent. Selection is global now, so readiness
// is checked against the global active template's provider (config args are ignored).
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

describe('isProjectProviderReady (global active template)', () => {
  it('is ready when the global active template agent provider has a key, even if the selected provider is a different keyless one', () => {
    configManager.setSelectedProvider('huggingface');
    configManager.setProviderApiKey('openrouter', 'sk-test');
    seedGlobalTemplate('openrouter', 'deepseek/deepseek-v4-flash');
    expect(isProjectProviderReady()).toBe(true);
  });

  it('is not ready when the global active template agent provider has no key (a different provider having one does not count)', () => {
    configManager.setProviderApiKey('openrouter', 'sk-test');
    seedGlobalTemplate('anthropic', 'claude-x');
    expect(isProjectProviderReady()).toBe(false);
  });

  it('treats a local agent provider as ready without a key', () => {
    seedGlobalTemplate('ollama', 'llama3.2:latest');
    expect(isProjectProviderReady()).toBe(true);
  });

  it('follows the global default set to the or-recommended built-in', () => {
    configManager.setProviderApiKey('openrouter', 'sk-test');
    configManager.setDefaultTemplateId('or-recommended');
    expect(isProjectProviderReady()).toBe(true);
  });
});

describe('shouldAutoAssignAgent (global active template)', () => {
  it('returns true when the global active template agent provider has no key', () => {
    seedGlobalTemplate('huggingface', 'deepseek-ai/DeepSeek-V4-Flash');
    expect(shouldAutoAssignAgent()).toBe(true);
  });

  it('returns false when the global active template agent provider is ready', () => {
    configManager.setProviderApiKey('anthropic', 'sk-test');
    seedGlobalTemplate('anthropic', 'claude-x');
    expect(shouldAutoAssignAgent()).toBe(false);
  });

  it('returns false for a local provider that is always ready', () => {
    seedGlobalTemplate('ollama', 'llama3.2:latest');
    expect(shouldAutoAssignAgent()).toBe(false);
  });
});
