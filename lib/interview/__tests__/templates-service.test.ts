import { beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { interviewTemplatesService } from '../templates-service';
import type { InterviewTemplate } from '../types';

beforeAll(() => {
  if (typeof (globalThis as any).localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    };
  }
});

const sample = (over: Partial<InterviewTemplate> = {}): InterviewTemplate => ({
  id: 'my-interview', title: 'My Interview', description: 'd',
  artifacts: [{ path: '/.interviews/my-interview.md' }],
  items: [{ id: 'q1', elicit: 'Q?', completion: [{ type: 'judge', criteria: 'C', description: 'c' }] }],
  ...over,
});

describe('interviewTemplatesService', () => {
  beforeEach(async () => {
    localStorage.clear();
    await interviewTemplatesService.clearCustom();
  });

  it('merges built-ins and custom, built-ins flagged read-only', async () => {
    const all = await interviewTemplatesService.getAllTemplates();
    const builtin = all.find(t => t.id === 'understand-company');
    expect(builtin?.isBuiltIn).toBe(true);
    await interviewTemplatesService.createTemplate(sample());
    const all2 = await interviewTemplatesService.getAllTemplates();
    expect(all2.find(t => t.id === 'my-interview')).toBeTruthy();
  });

  it('refuses to overwrite or delete a built-in id', async () => {
    await expect(interviewTemplatesService.createTemplate(sample({ id: 'understand-company' }))).rejects.toThrow();
    await expect(interviewTemplatesService.deleteTemplate('understand-company')).rejects.toThrow();
  });

  it('persists across a reload (new localStorage read)', async () => {
    await interviewTemplatesService.createTemplate(sample());
    await interviewTemplatesService.forceReload();
    const t = await interviewTemplatesService.getTemplate('my-interview');
    expect(t?.title).toBe('My Interview');
    expect(t?.createdAt instanceof Date).toBe(true);
  });

  it('importFromServer stores with sync metadata', async () => {
    await interviewTemplatesService.importFromServer({ ...sample(), updatedAt: new Date() } as InterviewTemplate);
    const t = await interviewTemplatesService.getTemplate('my-interview');
    expect(t?.lastSyncedAt instanceof Date).toBe(true);
  });
});
