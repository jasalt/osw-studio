import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configManager } from '@/lib/config/storage';
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

describe('migrateModels', () => {
  it('seeds a Default template, preferring the code model when the split was on', () => {
    localStorage.setItem('osw-studio-settings', JSON.stringify({ selectedProvider: 'openrouter', providerModels: { openrouter: 'a/b' } }));
    localStorage.setItem('osw-studio-use-separate-chat-model-openrouter', 'true');
    localStorage.setItem('osw-studio-code-model-openrouter', 'code/model');
    configManager.migrateModels();
    const def = configManager.getModelTemplate(configManager.getDefaultTemplateId());
    expect(def?.assignment.agent).toEqual({ provider: 'openrouter', model: 'code/model' });
    expect(def?.builtin).toBe(false); // the migrated Default is an editable carry-over, not a built-in
    expect(localStorage.getItem('osw-studio-code-model-openrouter')).toBeNull(); // split keys dropped
  });
  it('is idempotent (default model when settings are empty)', () => {
    configManager.migrateModels();
    const first = configManager.getDefaultTemplateId();
    configManager.migrateModels();
    expect(configManager.getDefaultTemplateId()).toBe(first);
    // Built-ins are always present via merge; migration must not duplicate the
    // single stored (non-builtin) template it seeds.
    const stored = Object.values(configManager.getModelTemplates()).filter((tpl) => !tpl.builtin);
    expect(stored).toHaveLength(1);
  });
});
