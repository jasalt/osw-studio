// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Isolate TemplateService from the real VFS adapter and server sync so we can assert only the
// UI-notification behavior: mutations fire a `templatesChanged` window event.
const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  getStorageAdapter: vi.fn(),
  saveCustomTemplate: vi.fn(),
  deleteCustomTemplate: vi.fn(),
  getAllCustomTemplates: vi.fn(),
}));

vi.mock('@/lib/vfs', () => ({
  vfs: {
    init: mocks.init,
    getStorageAdapter: mocks.getStorageAdapter,
  },
}));
vi.mock('@/lib/vfs/auto-sync', () => ({
  autoSyncTemplate: vi.fn(),
  autoDeleteTemplate: vi.fn(),
}));
vi.mock('@/lib/utils', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { TemplateService } from '../template-service';

describe('TemplateService templatesChanged event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.init.mockResolvedValue(undefined);
    mocks.getStorageAdapter.mockReturnValue({
      saveCustomTemplate: mocks.saveCustomTemplate,
      deleteCustomTemplate: mocks.deleteCustomTemplate,
      getAllCustomTemplates: mocks.getAllCustomTemplates,
    });
  });

  it('dispatches templatesChanged when a custom template is deleted', async () => {
    const svc = new TemplateService();
    const listener = vi.fn();
    window.addEventListener('templatesChanged', listener);
    try {
      await svc.deleteCustomTemplate('t1');
    } finally {
      window.removeEventListener('templatesChanged', listener);
    }

    expect(mocks.deleteCustomTemplate).toHaveBeenCalledWith('t1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch templatesChanged when the delete fails', async () => {
    mocks.deleteCustomTemplate.mockRejectedValueOnce(new Error('boom'));
    const svc = new TemplateService();
    const listener = vi.fn();
    window.addEventListener('templatesChanged', listener);
    try {
      await expect(svc.deleteCustomTemplate('t1')).rejects.toThrow();
    } finally {
      window.removeEventListener('templatesChanged', listener);
    }

    expect(listener).not.toHaveBeenCalled();
  });
});
