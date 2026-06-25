import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/vfs', () => ({
  vfs: { getProject: vi.fn(async (id: string) =>
    id === 'with-override'
      ? { settings: { models: { templateId: 'default', overrides: { agent: { provider: 'openai', model: 'gpt' } } } } }
      : { settings: {} }) },
}));

import { configManager } from '@/lib/config/storage';
import { getProjectAssignment, resolveProjectAssignment } from '@/lib/llm/models/project-assignment';
import type { ModelTemplate } from '@/lib/llm/models/assignment';

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

const tpl: ModelTemplate = { id: 'default', name: 'Default',
  assignment: { agent: { provider: 'openrouter', model: 'x/y' }, imageGen: null, voiceInput: 'browser', autoCompact: true, compactLimit: null } };

beforeEach(() => { stubBrowserStorage(); configManager.saveModelTemplate(tpl); configManager.setDefaultTemplateId('default'); });
afterEach(() => vi.unstubAllGlobals());

describe('getProjectAssignment', () => {
  it('falls back to the default template when the project has no models config', async () => {
    expect((await getProjectAssignment('plain')).agent).toEqual({ provider: 'openrouter', model: 'x/y' });
  });
  it('applies the project override', async () => {
    expect((await getProjectAssignment('with-override')).agent).toEqual({ provider: 'openai', model: 'gpt' });
  });
});

describe('resolveProjectAssignment', () => {
  it('falls back to the default template when config is undefined', () => {
    expect(resolveProjectAssignment(undefined)?.agent).toEqual({ provider: 'openrouter', model: 'x/y' });
  });

  it('applies an in-hand override onto the template', () => {
    const resolved = resolveProjectAssignment({
      templateId: 'default',
      overrides: { agent: { provider: 'openai', model: 'gpt' } },
    });
    expect(resolved?.agent).toEqual({ provider: 'openai', model: 'gpt' });
    // Untouched slots still come from the template.
    expect(resolved?.voiceInput).toBe('browser');
  });

  it('falls back to the default template when the config points at a missing template', () => {
    expect(resolveProjectAssignment({ templateId: 'does-not-exist' })?.agent)
      .toEqual({ provider: 'openrouter', model: 'x/y' });
  });

  it('returns null when no template exists at all (migration never ran)', () => {
    stubBrowserStorage(); // reset to empty storage — no templates saved
    expect(resolveProjectAssignment(undefined)).toBeNull();
  });
});
