import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
import { getActiveTemplate, saveAsTemplate, resolveActiveAssignment } from '@/lib/llm/models/template-store';
import type { ModelTemplate, ModelAssignment } from '@/lib/llm/models/assignment';

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

describe('working selection (activeAssignment)', () => {
  const other: ModelAssignment = { agent: { provider: 'openai', model: 'gpt-4' }, imageGen: null, voiceInput: null, autoCompact: false, compactLimit: 100 };

  it('getActiveAssignment falls back to the active template assignment when unset', () => {
    // setDefaultTemplateId loads the template into working; clear it to test the fallback.
    configManager.setSetting('activeAssignment', undefined);
    expect(configManager.getActiveAssignment()).toEqual(seed.assignment);
    expect(resolveActiveAssignment()).toEqual(seed.assignment);
  });

  it('selecting a template loads its assignment into the working selection', () => {
    const t: ModelTemplate = { id: 't-select', name: 'Select', assignment: other };
    configManager.saveModelTemplate(t);
    configManager.setDefaultTemplateId('t-select');
    expect(configManager.getActiveAssignment()).toEqual(other);
  });

  it('setActiveAssignment round-trips and returns a copy; resolver reflects it', () => {
    configManager.setActiveAssignment(other);
    const got = configManager.getActiveAssignment();
    expect(got).toEqual(other);
    expect(got).not.toBe(other); // shallow copy, not the same reference
    // Working selection diverges from the template (which stayed 'default').
    expect(resolveActiveAssignment()).toEqual(other);
    expect(resolveActiveAssignment()).not.toEqual(getActiveTemplate().assignment);
  });

  it('saving the ACTIVE template reloads the working selection to the saved assignment', () => {
    // 'default' is the active template (set in beforeEach). Diverge working first.
    configManager.setActiveAssignment(other);
    const edited: ModelTemplate = { id: 'default', name: 'Default', assignment: { ...seed.assignment, agent: { provider: 'groq', model: 'llama' } } };
    configManager.saveModelTemplate(edited);
    expect(configManager.getActiveAssignment()).toEqual(edited.assignment);
  });

  it('saving a NON-active template does not change the working selection', () => {
    configManager.setActiveAssignment(other);
    const t: ModelTemplate = { id: 't-nonactive', name: 'Other', assignment: { ...seed.assignment, agent: { provider: 'openai', model: 'gpt-4o' } } };
    configManager.saveModelTemplate(t);
    expect(configManager.getActiveAssignment()).toEqual(other);
  });

  it('importModelTemplateFromServer of the active template updates the working selection', () => {
    configManager.setActiveAssignment(other);
    const synced: ModelTemplate = { id: 'default', name: 'Default', assignment: { ...seed.assignment, agent: { provider: 'anthropic', model: 'claude' } }, updatedAt: new Date() };
    configManager.importModelTemplateFromServer(synced);
    expect(configManager.getActiveAssignment()).toEqual(synced.assignment);
  });

  it('getActiveAssignment returns a deep copy (mutating .agent does not corrupt stored state)', () => {
    configManager.setSetting('activeAssignment', undefined); // exercise the fallback (built-in) path
    const first = configManager.getActiveAssignment();
    first.agent.provider = 'groq';
    first.agent.model = 'mutated';
    const second = configManager.getActiveAssignment();
    expect(second.agent).toEqual(seed.assignment.agent);
  });
});
