import type { WebSearchDirectProvider } from '../types';

export const duckduckgo = {
  id: 'duckduckgo',
  name: 'DuckDuckGo',
  auth: 'none',
  nativeContent: false,
  async search(query, opts, signal) {
    const { searchDuckDuckGo } = await import('ts-duckduckgo-search');
    const results = await searchDuckDuckGo(query, { maxResults: opts.count ?? 5, signal });
    return results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
    }));
  },
} satisfies WebSearchDirectProvider;
