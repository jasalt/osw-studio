export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string; // page content, present only when the provider returns it
}
export interface WebSearchOpts { count?: number; markdown?: boolean; }
export interface WebSearchAuth { key?: string; searxngUrl?: string; }
export type WebSearchProviderId = 'tavily' | 'firecrawl' | 'brave' | 'searxng';
export interface WebSearchProvider {
  id: WebSearchProviderId;
  name: string;
  auth: 'key' | 'url';
  nativeContent: boolean; // true if search results already include page content
  buildRequest(query: string, opts: WebSearchOpts, auth: WebSearchAuth): { url: string; init: RequestInit };
  normalize(raw: any): WebSearchResult[];
}
