import { describe, it, expect } from 'vitest';
import { createTestStore } from '@/lib/stores/__tests__/test-helpers';

describe('project model config mirror', () => {
  it('initProject mirrors settings.models onto the slice', () => {
    const store = createTestStore();
    store.getState().initProject({ id: 'p1', name: 'P', settings: { models: { templateId: 'default', overrides: {} } } });
    expect(store.getState().projectModelConfig).toEqual({ templateId: 'default', overrides: {} });
  });
  it('updateProjectSettings updates the mirror', () => {
    const store = createTestStore();
    store.getState().updateProjectSettings({ models: { templateId: 'budget' } });
    expect(store.getState().projectModelConfig).toEqual({ templateId: 'budget' });
  });
});
