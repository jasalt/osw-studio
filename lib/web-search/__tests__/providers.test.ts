import { describe, it, expect, vi } from 'vitest';
import { duckduckgo } from '../providers/duckduckgo';
import { tavily } from '../providers/tavily';
import { brave } from '../providers/brave';
import { searxng } from '../providers/searxng';
import { firecrawl } from '../providers/firecrawl';

vi.mock('ts-duckduckgo-search', () => ({
  searchDuckDuckGo: vi.fn(async () => [
    { title: 'T', url: 'https://x', description: 'd' },
  ]),
}));

describe('duckduckgo', () => {
  it('searches without credentials and normalizes results', async () => {
    expect(duckduckgo.auth).toBe('none');
    await expect(duckduckgo.search('q', { count: 1 }, AbortSignal.timeout(1000)))
      .resolves.toEqual([{ title: 'T', url: 'https://x', snippet: 'd' }]);
  });

  it('maps a library failure to an actionable error', async () => {
    const { searchDuckDuckGo } = await import('ts-duckduckgo-search');
    vi.mocked(searchDuckDuckGo).mockRejectedValueOnce(new Error('challenge-form'));
    await expect(duckduckgo.search('q', { count: 1 }, AbortSignal.timeout(1000)))
      .rejects.toThrow(/switch to another search provider/);
  });
});

describe('tavily', () => {
  it('normalizes results and raw_content', () => {
    const raw = { results: [{ title: 'T', url: 'https://x', content: 'snip', raw_content: '# md' }] };
    expect(tavily.normalize(raw)).toEqual([{ title: 'T', url: 'https://x', snippet: 'snip', content: '# md' }]);
  });
  it('returns [] when results missing', () => {
    expect(tavily.normalize({})).toEqual([]);
  });
  it('builds a POST request with bearer auth and max_results', () => {
    const { url, init } = tavily.buildRequest('q', { count: 3, markdown: true }, { key: 'k' });
    expect(url).toBe('https://api.tavily.com/search');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string,string>).Authorization).toBe('Bearer k');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ query: 'q', max_results: 3, include_raw_content: 'markdown' });
  });
});

describe('brave', () => {
  it('normalizes web.results[].description to snippet, no content', () => {
    const raw = { web: { results: [{ title: 'T', url: 'https://x', description: 'd' }] } };
    expect(brave.normalize(raw)).toEqual([{ title: 'T', url: 'https://x', snippet: 'd' }]);
  });
  it('returns [] when web missing', () => {
    expect(brave.normalize({})).toEqual([]);
  });
  it('builds a GET request with subscription token', () => {
    const { url, init } = brave.buildRequest('hello world', { count: 8 }, { key: 'bk' });
    expect(url).toContain('https://api.search.brave.com/res/v1/web/search?q=hello');
    expect(url).toContain('count=8');
    expect((init.headers as Record<string,string>)['X-Subscription-Token']).toBe('bk');
  });
});

describe('searxng', () => {
  it('normalizes results[].content to snippet', () => {
    const raw = { results: [{ title: 'T', url: 'https://x', content: 'c' }] };
    expect(searxng.normalize(raw)).toEqual([{ title: 'T', url: 'https://x', snippet: 'c' }]);
  });
  it('builds a GET request against the instance url with format=json', () => {
    const { url } = searxng.buildRequest('q', {}, { searxngUrl: 'https://searx.example/' });
    expect(url).toBe('https://searx.example/search?q=q&format=json');
  });
});

describe('firecrawl', () => {
  it('normalizes data.web[] with markdown content', () => {
    const raw = { success: true, data: { web: [{ title: 'T', url: 'https://x', description: 'd', markdown: '# md' }] } };
    expect(firecrawl.normalize(raw)).toEqual([{ title: 'T', url: 'https://x', snippet: 'd', content: '# md' }]);
  });
  it('handles a flat data array', () => {
    const raw = { data: [{ title: 'T', url: 'https://x', description: 'd' }] };
    expect(firecrawl.normalize(raw)).toEqual([{ title: 'T', url: 'https://x', snippet: 'd' }]);
  });
  it('returns [] when data missing', () => {
    expect(firecrawl.normalize({})).toEqual([]);
  });
});
