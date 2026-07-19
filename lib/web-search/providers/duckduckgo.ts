import type { WebSearchDirectProvider } from '../types';

export const duckduckgo = {
  id: 'duckduckgo',
  name: 'DuckDuckGo',
  auth: 'none',
  nativeContent: false,
  async search(query, opts, signal) {
    const { searchDuckDuckGo } = await import('ts-duckduckgo-search');
    let results;
    try {
      results = await searchDuckDuckGo(query, { maxResults: Math.max(1, opts.count ?? 5), signal });
    } catch (e) {
      // The library reports every failure with the same generic message and hides
      // the real cause. Turn it into something the agent can act on: DuckDuckGo is
      // unofficial scraping and commonly rate-limits or serves a bot challenge,
      // especially from a shared/hosted IP.
      throw new Error(
        signal.aborted
          ? 'timed out (no response within 20s) — retry, or switch to another search provider under Connections.'
          : 'unavailable — DuckDuckGo may be rate-limiting or blocking this server (common on shared or hosted instances). Retry shortly, or switch to another search provider under Connections.',
        { cause: e }
      );
    }
    return results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
    }));
  },
} satisfies WebSearchDirectProvider;
