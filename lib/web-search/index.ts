import type { WebSearchProvider, WebSearchProviderId } from './types';
import { tavily } from './providers/tavily';
import { firecrawl } from './providers/firecrawl';
import { brave } from './providers/brave';
import { searxng } from './providers/searxng';

export const WEB_SEARCH_PROVIDERS: Record<WebSearchProviderId, WebSearchProvider> = {
  tavily, firecrawl, brave, searxng,
};
export function getWebSearchProvider(id: WebSearchProviderId): WebSearchProvider {
  return WEB_SEARCH_PROVIDERS[id];
}
export * from './types';
