import type { WebSearchProvider } from '../types';

export const brave: WebSearchProvider = {
  id: 'brave',
  name: 'Brave Search',
  auth: 'key',
  nativeContent: false,
  buildRequest(query, opts, auth) {
    const count = opts.count ?? 5;
    const url =
      'https://api.search.brave.com/res/v1/web/search?q=' +
      encodeURIComponent(query) +
      '&count=' +
      count;
    return {
      url,
      init: {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': auth.key ?? '',
        },
      },
    };
  },
  normalize(raw) {
    const results = raw?.web?.results;
    if (!Array.isArray(results)) return [];
    return results.map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  },
};
