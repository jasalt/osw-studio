import { configManager } from '@/lib/config/storage';
import { getAllProviders, getProviderArchetype } from '@/lib/llm/providers/registry';
import type { ProviderId } from '@/lib/llm/providers/types';

/**
 * Whether a provider is connected and usable.
 *
 * Connected = has an API key / OAuth token. For LOCAL providers, having cached
 * models also counts (reaching the local server is the connection — they have no
 * key). Cloud providers like HuggingFace expose a *public* model list that
 * `loadProviderModels` caches with no auth, so cached models there are NOT proof
 * of a connection — counting them would falsely show the provider as connected.
 */
export function isProviderConnected(id: ProviderId): boolean {
  if (configManager.getProviderApiKey(id)) return true;
  return getProviderArchetype(id) === 'local' && !!configManager.getCachedModels(id);
}

/** The provider IDs that are currently connected. */
export function getConnectedProviders(): ProviderId[] {
  return getAllProviders()
    .filter((p) => isProviderConnected(p.id))
    .map((p) => p.id);
}

/** Whether any provider is connected at all. */
export function hasAnyConnectedProvider(): boolean {
  return getAllProviders().some((p) => isProviderConnected(p.id));
}
