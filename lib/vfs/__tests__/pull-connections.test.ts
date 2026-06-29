import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pullConnections = vi.fn();
const pushConnection = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/vfs/sync-manager', () => ({
  getSyncManager: () => ({ pullConnections, pushConnection }),
}));

const getCustomProviders = vi.fn(() => ({}));
const setCustomProviders = vi.fn();
vi.mock('@/lib/llm/providers/custom-providers', () => ({
  getCustomProviders: () => getCustomProviders(),
  setCustomProviders: (m: unknown) => setCustomProviders(m),
}));

beforeEach(() => { pullConnections.mockReset(); pushConnection.mockReset(); getCustomProviders.mockReturnValue({}); setCustomProviders.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('pullConnectionsIntoCache', () => {
  it('does nothing outside server mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_MODE', 'false');
    const { pullConnectionsIntoCache } = await import('@/lib/vfs/auto-sync');
    await pullConnectionsIntoCache();
    expect(pullConnections).not.toHaveBeenCalled();
    expect(setCustomProviders).not.toHaveBeenCalled();
  });

  it('writes pulled records into the cache without re-pushing (no pull->push loop)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_MODE', 'true');
    pullConnections.mockResolvedValue({ success: true, connections: [
      { id: 'opencode-go', name: 'Opencode Go', baseUrl: 'https://opencode.ai/zen/go/v1', format: 'openai', apiKeyRequired: true },
    ]});
    const { pullConnectionsIntoCache } = await import('@/lib/vfs/auto-sync');
    await pullConnectionsIntoCache();
    expect(setCustomProviders).toHaveBeenCalledTimes(1);
    const written = setCustomProviders.mock.calls[0][0];
    expect(written['opencode-go']).toMatchObject({ id: 'opencode-go', baseUrl: 'https://opencode.ai/zen/go/v1' });
    expect(pushConnection).not.toHaveBeenCalled(); // crucial: pull must not trigger a push
  });
});
