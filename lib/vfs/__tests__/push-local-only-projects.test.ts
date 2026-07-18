import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Isolate the reconcile helper from the real VFS / push helper / UI. auto-sync imports several
// sibling modules at load time; mock them so importing the module under test is side-effect free.
const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  listProjects: vi.fn(),
  getProject: vi.fn(),
  pushProjectToServer: vi.fn(),
}));

vi.mock('@/lib/vfs', () => ({
  vfs: {
    init: mocks.init,
    listProjects: mocks.listProjects,
    getProject: mocks.getProject,
  },
}));
vi.mock('@/lib/vfs/push-project-to-server', () => ({
  pushProjectToServer: mocks.pushProjectToServer,
}));
vi.mock('@/lib/vfs/save-manager', () => ({ saveManager: {} }));
vi.mock('@/lib/api/backend-status', () => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ track: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/utils', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { pushLocalOnlyProjects } from '../auto-sync';

describe('pushLocalOnlyProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.init.mockResolvedValue(undefined);
    vi.stubEnv('NEXT_PUBLIC_SERVER_MODE', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is a no-op in browser mode (never lists or pushes)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_MODE', 'false');

    const result = await pushLocalOnlyProjects('w1');

    expect(result).toEqual({ pushed: 0, errors: 0 });
    expect(mocks.listProjects).not.toHaveBeenCalled();
    expect(mocks.pushProjectToServer).not.toHaveBeenCalled();
  });

  it('pushes only local-only projects (no serverUpdatedAt and no lastSyncedAt)', async () => {
    mocks.listProjects.mockResolvedValue([
      { id: 'local1' }, // never synced → local-only
      { id: 'synced1', serverUpdatedAt: new Date(), lastSyncedAt: new Date() }, // already synced
      { id: 'local2' }, // never synced → local-only
    ]);
    // Simulate pushProjectToServer stamping serverUpdatedAt on success.
    const stamped = new Set<string>();
    mocks.pushProjectToServer.mockImplementation(async (id: string) => { stamped.add(id); });
    mocks.getProject.mockImplementation(async (id: string) =>
      stamped.has(id) ? { id, serverUpdatedAt: new Date() } : { id }
    );

    const result = await pushLocalOnlyProjects('w1');

    expect(mocks.pushProjectToServer).toHaveBeenCalledTimes(2);
    expect(mocks.pushProjectToServer).toHaveBeenCalledWith('local1', 'w1');
    expect(mocks.pushProjectToServer).toHaveBeenCalledWith('local2', 'w1');
    expect(mocks.pushProjectToServer).not.toHaveBeenCalledWith('synced1', 'w1');
    expect(result).toEqual({ pushed: 2, errors: 0 });
  });

  it('does nothing when every project is already synced', async () => {
    mocks.listProjects.mockResolvedValue([
      { id: 's1', serverUpdatedAt: new Date() },
      { id: 's2', lastSyncedAt: new Date() },
    ]);

    const result = await pushLocalOnlyProjects();

    expect(mocks.pushProjectToServer).not.toHaveBeenCalled();
    expect(result).toEqual({ pushed: 0, errors: 0 });
  });

  it('counts an error when a push does not land (serverUpdatedAt still absent)', async () => {
    mocks.listProjects.mockResolvedValue([{ id: 'local1' }]);
    // Push silently failed inside pushProjectToServer (it swallows its own errors).
    mocks.pushProjectToServer.mockResolvedValue(undefined);
    mocks.getProject.mockResolvedValue({ id: 'local1' }); // still no serverUpdatedAt

    const result = await pushLocalOnlyProjects('w1');

    expect(result).toEqual({ pushed: 0, errors: 1 });
  });

  it('keeps going when one push throws, counting it as an error', async () => {
    mocks.listProjects.mockResolvedValue([{ id: 'local1' }, { id: 'local2' }]);
    mocks.pushProjectToServer.mockImplementation(async (id: string) => {
      if (id === 'local1') throw new Error('boom');
    });
    mocks.getProject.mockImplementation(async (id: string) =>
      id === 'local2' ? { id, serverUpdatedAt: new Date() } : { id }
    );

    const result = await pushLocalOnlyProjects();

    expect(mocks.pushProjectToServer).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ pushed: 1, errors: 1 });
  });
});
