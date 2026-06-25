import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const projects = new Map<string, any>();
vi.mock('@/lib/vfs', () => ({
  vfs: {
    getProject: vi.fn(async (id: string) => projects.get(id)),
    updateProject: vi.fn(async (p: any) => { projects.set(p.id, p); }),
  },
}));

import { configManager } from '@/lib/config/storage';
import { setProjectTemplate, setProjectSlotOverride, clearProjectOverrides } from '@/lib/llm/models/project-overrides';

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

beforeEach(() => {
  stubBrowserStorage();
  configManager.setDefaultTemplateId('default');
  projects.clear();
  projects.set('p1', { id: 'p1', name: 'P', settings: { runtime: 'static' } });
});
afterEach(() => vi.unstubAllGlobals());

describe('project-overrides', () => {
  it('setProjectTemplate seeds models config and persists via vfs.updateProject', async () => {
    const cfg = await setProjectTemplate('p1', 'budget');
    expect(cfg).toEqual({ templateId: 'budget', overrides: {} });
    expect(projects.get('p1').settings.models).toEqual({ templateId: 'budget', overrides: {} });
    expect(projects.get('p1').settings.runtime).toBe('static'); // untouched
  });

  it('setProjectSlotOverride merges and persists', async () => {
    await setProjectTemplate('p1', 'default');
    const cfg = await setProjectSlotOverride('p1', 'agent', { provider: 'openai', model: 'gpt' });
    expect(cfg.overrides).toEqual({ agent: { provider: 'openai', model: 'gpt' } });
    expect(projects.get('p1').settings.models.overrides.agent).toEqual({ provider: 'openai', model: 'gpt' });
  });

  it('clearProjectOverrides keeps templateId, empties overrides', async () => {
    await setProjectSlotOverride('p1', 'voiceInput', null);
    const cfg = await clearProjectOverrides('p1');
    expect(cfg.overrides).toEqual({});
    expect(cfg.templateId).toBe('default');
  });

  it('setProjectTemplate clears existing overrides on switch', async () => {
    await setProjectSlotOverride('p1', 'agent', { provider: 'openai', model: 'gpt' });
    const cfg = await setProjectTemplate('p1', 'budget');
    expect(cfg).toEqual({ templateId: 'budget', overrides: {} });
    expect(projects.get('p1').settings.models.overrides).toEqual({});
  });
});
