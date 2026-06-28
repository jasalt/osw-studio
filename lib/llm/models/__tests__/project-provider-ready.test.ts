import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { isProjectProviderReady } from '@/lib/llm/models/project-assignment';
import type { ModelTemplate, ProjectModelConfig } from '@/lib/llm/models/assignment';
import type { ProviderId } from '@/lib/llm/providers/types';

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
afterEach(() => vi.unstubAllGlobals());

function seedTemplate(agentProvider: ProviderId, agentModel: string): ProjectModelConfig {
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
  return { templateId: 'tpl1', overrides: {} };
}

describe('isProjectProviderReady', () => {
  it('is ready when the project agent provider has a key, even if the global default is a different keyless provider (issue #4)', () => {
    // Reproduces the HuggingFace Space case: global default is HuggingFace (no key),
    // but the project's agent is OpenRouter, which does have a key. The old check
    // keyed off the global provider and wrongly returned false.
    configManager.setSelectedProvider('huggingface');
    configManager.setProviderApiKey('openrouter', 'sk-test');
    const config = seedTemplate('openrouter', 'deepseek/deepseek-v4-flash');
    expect(isProjectProviderReady(config)).toBe(true);
  });

  it('is not ready when the project agent provider has no key (a different provider having one does not count)', () => {
    configManager.setProviderApiKey('openrouter', 'sk-test');
    const config = seedTemplate('anthropic', 'claude-x');
    expect(isProjectProviderReady(config)).toBe(false);
  });

  it('treats a local agent provider as ready without a key', () => {
    const config = seedTemplate('ollama', 'llama3.2:latest');
    expect(isProjectProviderReady(config)).toBe(true);
  });
});
