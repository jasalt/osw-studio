import type { WebSearchProvider } from '../types';

export const searxng: WebSearchProvider = {
  id: 'searxng',
  name: 'SearXNG',
  auth: 'url',
  nativeContent: false,
  buildRequest(query, _opts, auth) {
    const base = (auth.searxngUrl ?? '').replace(/\/$/, '');
    const url = base + '/search?q=' + encodeURIComponent(query) + '&format=json';
    return {
      url,
      init: {
        method: 'GET',
      },
    };
  },
  normalize(raw) {
    const results = raw?.results;
    if (!Array.isArray(results)) return [];
    return results.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  },
};
