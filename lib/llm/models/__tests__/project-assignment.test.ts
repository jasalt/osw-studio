import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { configManager } from '@/lib/config/storage';
import { getProjectAssignment } from '@/lib/llm/models/project-assignment';
import { resolveActiveAssignment, getActiveTemplate } from '@/lib/llm/models/template-store';
import type { ModelTemplate } from '@/lib/llm/models/assignment';

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

const tpl: ModelTemplate = { id: 'default', name: 'Default',
  assignment: { agent: { provider: 'openrouter', model: 'x/y' }, imageGen: null, voiceInput: 'browser', autoCompact: true, compactLimit: null } };

beforeEach(() => { stubBrowserStorage(); configManager.saveModelTemplate(tpl); configManager.setDefaultTemplateId('default'); });
afterEach(() => vi.unstubAllGlobals());

describe('getProjectAssignment (global)', () => {
  it('resolves the global active template', async () => {
    expect((await getProjectAssignment()).agent).toEqual({ provider: 'openrouter', model: 'x/y' });
  });

  it('follows the global default template when it changes to a built-in', async () => {
    configManager.setDefaultTemplateId('or-recommended');
    expect((await getProjectAssignment()).agent)
      .toEqual({ provider: 'openrouter', model: 'deepseek/deepseek-v4-flash' });
  });
});

describe('resolveActiveAssignment', () => {
  it('returns the global active template assignment', () => {
    expect(resolveActiveAssignment().agent).toEqual({ provider: 'openrouter', model: 'x/y' });
  });

  it('returns a new object, not the template live assignment (callers cannot mutate a shared built-in)', () => {
    expect(resolveActiveAssignment()).not.toBe(getActiveTemplate().assignment);
  });

  it('follows setDefaultTemplateId to a built-in template', () => {
    configManager.setDefaultTemplateId('or-recommended');
    expect(resolveActiveAssignment().agent)
      .toEqual({ provider: 'openrouter', model: 'deepseek/deepseek-v4-flash' });
  });

  it('does not throw on a dangling defaultTemplateId, falling back to a guaranteed template', () => {
    configManager.setDefaultTemplateId('does-not-exist');
    let resolved: ReturnType<typeof resolveActiveAssignment> | undefined;
    expect(() => { resolved = resolveActiveAssignment(); }).not.toThrow();
    // Falls back to the migrated "default" (agent x/y) or a built-in — a real template's agent.
    expect(resolved?.agent).toEqual({ provider: 'openrouter', model: 'x/y' });
  });
});
