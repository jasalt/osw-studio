import type { WebSearchProvider } from '../types';

export const tavily: WebSearchProvider = {
  id: 'tavily',
  name: 'Tavily',
  auth: 'key',
  nativeContent: true,
  buildRequest(query, opts, auth) {
    return {
      url: 'https://api.tavily.com/search',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + auth.key,
        },
        body: JSON.stringify({
          query,
          max_results: opts.count ?? 5,
          include_raw_content: opts.markdown ? 'markdown' : false,
        }),
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
      content: r.raw_content || undefined,
    }));
  },
};
