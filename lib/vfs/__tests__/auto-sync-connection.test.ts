import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProviderConfig } from '@/lib/llm/providers/types';

const pushConnection = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/vfs/sync-manager', () => ({
  getSyncManager: () => ({ pushConnection }),
}));

const cfg: ProviderConfig = {
  id: 'opencode-go', name: 'Opencode Go', description: 'x',
  apiKeyRequired: true, baseUrl: 'https://opencode.ai/zen/go/v1',
  supportsModelDiscovery: true, supportsFunctions: true, supportsStreaming: true,
};

beforeEach(() => { pushConnection.mockClear(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('autoSyncConnection', () => {
  it('does nothing when not in server mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_MODE', 'false');
    const { autoSyncConnection } = await import('@/lib/vfs/auto-sync');
    await autoSyncConnection(cfg);
    expect(pushConnection).not.toHaveBeenCalled();
  });

  it('pushes a key-less record in server mode (the secret never appears in the payload)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_MODE', 'true');
    const { autoSyncConnection } = await import('@/lib/vfs/auto-sync');
    // Even if a secret key exists elsewhere, it must not be in the synced payload.
    await autoSyncConnection({ ...cfg });
    expect(pushConnection).toHaveBeenCalledTimes(1);
    const payload = pushConnection.mock.calls[0][0];
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('sk-');           // no key material
    expect(serialized).not.toContain('"apiKey"');       // no key field
    expect(payload).toMatchObject({ id: 'opencode-go', baseUrl: cfg.baseUrl, format: 'openai', apiKeyRequired: true });
  });
});
