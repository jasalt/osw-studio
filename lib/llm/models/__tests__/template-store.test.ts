import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { getActiveTemplate, saveAsTemplate } from '@/lib/llm/models/template-store';
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
const seed: ModelTemplate = { id: 'default', name: 'Default', builtin: true,
  assignment: { agent: { provider: 'openrouter', model: 'x/y' }, imageGen: null, voiceInput: 'browser', autoCompact: true, compactLimit: null } };

beforeEach(() => { stubBrowserStorage(); configManager.saveModelTemplate(seed); configManager.setDefaultTemplateId('default'); });
afterEach(() => vi.unstubAllGlobals());

describe('template-store', () => {
  it('saveAsTemplate clones the active assignment under a new id', () => {
    const t = saveAsTemplate('Mine');
    expect(t.id).not.toBe('default');
    expect(t.name).toBe('Mine');
    expect(t.assignment).toEqual(getActiveTemplate().assignment);
    expect(configManager.getModelTemplate(t.id)).toEqual(t);
  });
  it('saveAsTemplate clones a passed-in draft assignment (e.g. tweaked built-in)', () => {
    const draft = { ...getActiveTemplate().assignment, agent: { provider: 'openai' as const, model: 'gpt' } };
    const t = saveAsTemplate('From draft', draft);
    expect(t.assignment.agent).toEqual({ provider: 'openai', model: 'gpt' });
    expect(t.builtin).toBe(false);
  });
});
