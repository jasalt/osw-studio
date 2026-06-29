import { describe, it, expect } from 'vitest';
import { toConnectionRecord, fromConnectionRecord, type CustomConnection } from '@/lib/llm/providers/connection-record';
import type { ProviderConfig } from '@/lib/llm/providers/types';

const cfg: ProviderConfig = {
  id: 'opencode-go', name: 'Opencode Go', description: 'x',
  apiKeyRequired: true, baseUrl: 'https://opencode.ai/zen/go/v1',
  supportsModelDiscovery: true, supportsFunctions: true, supportsStreaming: true,
};

describe('connection-record', () => {
  it('maps a ProviderConfig to a record with no key material', () => {
    const rec = toConnectionRecord(cfg);
    expect(rec).toMatchObject({
      id: 'opencode-go', name: 'Opencode Go',
      baseUrl: 'https://opencode.ai/zen/go/v1', format: 'openai', apiKeyRequired: true,
    });
    expect(JSON.stringify(rec)).not.toContain('"apiKey":');
  });
  it('round-trips record -> config with supports flags rebuilt', () => {
    const rec: CustomConnection = toConnectionRecord(cfg);
    const back = fromConnectionRecord(rec);
    expect(back).toMatchObject({ id: 'opencode-go', baseUrl: cfg.baseUrl, apiKeyRequired: true,
      supportsModelDiscovery: true, supportsFunctions: true, supportsStreaming: true });
  });
});
