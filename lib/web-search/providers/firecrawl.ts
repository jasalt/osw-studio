import type { WebSearchProvider } from '../types';

export const firecrawl: WebSearchProvider = {
  id: 'firecrawl',
  name: 'Firecrawl',
  auth: 'key',
  nativeContent: true,
  buildRequest(query, opts, auth) {
    return {
      url: 'https://api.firecrawl.dev/v2/search',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + auth.key,
        },
        body: JSON.stringify({
          query,
          limit: opts.count ?? 5,
          ...(opts.markdown ? { scrapeOptions: { formats: ['markdown'] } } : {}),
        }),
      },
    };
  },
  normalize(raw) {
    // v2 response shape: { success, data: { web: [{ title, url, description, markdown }] } }.
    // Some responses return `data` as a flat array, so handle both.
    const items = Array.isArray(raw?.data) ? raw.data : (raw?.data?.web ?? []);
    if (!Array.isArray(items)) return [];
    return items.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description || '',
      content: r.markdown || undefined,
    }));
  },
};
