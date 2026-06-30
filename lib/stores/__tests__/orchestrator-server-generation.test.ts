import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestStore, setupOrchestratorMocks } from './test-helpers';
import { getProjectAssignment } from '@/lib/llm/models/project-assignment';
import { toast } from 'sonner';

// Side-effects reached only on the success path — stubbed so the test stays
// deterministic in the node environment (no window / EventSource / VFS).
vi.mock('@/lib/vfs/sync-manager', () => ({
  getSyncManager: () => ({ pushSingleProject: vi.fn().mockResolvedValue({ success: true }) }),
}));
vi.mock('@/lib/vfs/checkpoint', () => ({
  checkpointManager: { createCheckpoint: vi.fn().mockResolvedValue({ id: 'cp1', description: '', timestamp: 0 }) },
}));

setupOrchestratorMocks();

// Regression for the server-mode generation path: startServerGeneration must
// resolve the agent model from the per-project assignment, not the legacy global
// provider/model. Previously it used configManager.getProviderModel(), so a
// project configured purely per-project (e.g. opencode-go, which has no default
// model) sent an empty model and /api/server-generate rejected it with
// "Missing required fields: ... model".
describe('orchestrator slice — startServerGeneration model resolution', () => {
  let store: ReturnType<typeof createTestStore>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
    // connectSSE touches EventSource/window — not available in node. No-op it.
    store.setState({ connectSSE: vi.fn() });
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ taskId: 't1' }) });
    vi.stubGlobal('fetch', fetchMock);
    // The shared mock's getProjectAssignment defaults to openai/gpt-4; override per-test.
    vi.mocked(getProjectAssignment).mockResolvedValue({
      agent: { provider: 'opencode-go', model: 'minimax-m2.7' },
      imageGen: null,
      voiceInput: null,
      autoCompact: false,
      compactLimit: null,
    } as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the per-project assignment model, not the global model', async () => {
    await store.getState().startServerGeneration('proj1', 'build a landing page', false);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/server-generate');
    const body = JSON.parse((init as RequestInit).body as string);
    // The model must come from the assignment (minimax-m2.7), not the global
    // configManager.getProviderModel() which the shared mock returns as 'gpt-4'.
    expect(body.model).toBe('minimax-m2.7');
    expect(body.providerConfig.provider).toBe('opencode-go');
  });

  it('aborts with a clear message when the project has no model selected', async () => {
    vi.mocked(getProjectAssignment).mockResolvedValueOnce({
      agent: { provider: 'opencode-go', model: '' },
      imageGen: null,
      voiceInput: null,
      autoCompact: false,
      compactLimit: null,
    } as any);

    await store.getState().startServerGeneration('proj1', 'build a landing page', false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('aborts when project model assignment cannot be resolved', async () => {
    vi.mocked(getProjectAssignment).mockRejectedValueOnce(new Error('no model template available'));

    await store.getState().startServerGeneration('proj1', 'build a landing page', false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
