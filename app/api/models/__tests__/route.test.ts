import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/models/route';
import type { NextRequest } from 'next/server';

/**
 * Route-level guard wiring for /api/models. This locks the behavior that regressed once:
 * the SSRF guard must apply to user-supplied custom endpoints but NOT to built-in local
 * providers (which legitimately point at localhost). A guard rejection falls through to
 * `{ models: [] }`, so the meaningful signal is whether the outbound fetch is reached.
 */

function makeReq(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

function jsonResponse(obj: unknown): Response {
  const text = JSON.stringify(obj);
  return { ok: true, status: 200, json: async () => obj, text: async () => text } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes('127.0.0.1:11434')) return jsonResponse({ models: [{ name: 'llama3' }] });
    if (u.includes('api.example.com')) return jsonResponse({ data: [{ id: 'gpt-x' }] });
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('/api/models SSRF guard wiring', () => {
  it('rejects a custom provider on a private/loopback URL — no outbound fetch is made', async () => {
    const res = await POST(makeReq({ provider: 'my-cloud', apiKey: 'sk-x', baseUrl: 'http://169.254.169.254/v1' }));
    const data = await res.json();
    expect(data.models).toEqual([]);          // guard threw → outer catch → empty
    expect(fetchMock).not.toHaveBeenCalled();  // never reached the endpoint
  });

  it('allows a custom provider on a public URL — fetches that endpoint', async () => {
    const res = await POST(makeReq({ provider: 'my-cloud', apiKey: 'sk-x', baseUrl: 'https://api.example.com/v1' }));
    const data = await res.json();
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1/models', expect.anything());
    expect(data.models).toContain('gpt-x');
  });

  it('does NOT guard built-in local providers — Ollama on localhost still works (regression)', async () => {
    const res = await POST(makeReq({ provider: 'ollama', baseUrl: 'http://localhost:11434/v1' }));
    const data = await res.json();
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:11434/api/tags');
    expect(data.models).toContain('llama3');
  });
});
