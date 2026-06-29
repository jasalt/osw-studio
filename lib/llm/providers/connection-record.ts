import type { ProviderConfig } from './types';

export type ConnectionFormat = 'openai'; // 'anthropic' | 'google' added by the format-selector follow-up

/** Server/sync shape for a custom connection. Contains NO key material, ever. */
export interface CustomConnection {
  id: string;
  name: string;
  baseUrl: string;
  format: ConnectionFormat;
  apiKeyRequired: boolean;
  updatedAt?: string;
}

export function toConnectionRecord(cfg: ProviderConfig): CustomConnection {
  return {
    id: cfg.id,
    name: cfg.name,
    baseUrl: cfg.baseUrl ?? '',
    format: 'openai',
    apiKeyRequired: cfg.apiKeyRequired,
  };
}

export function fromConnectionRecord(rec: CustomConnection): ProviderConfig {
  return {
    id: rec.id,
    name: rec.name,
    description: `Custom OpenAI-compatible endpoint at ${rec.baseUrl}`,
    apiKeyRequired: rec.apiKeyRequired,
    baseUrl: rec.baseUrl,
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
  };
}
