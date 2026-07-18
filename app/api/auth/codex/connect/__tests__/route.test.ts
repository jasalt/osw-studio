import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, POST } from '../route';
import { CODEX_COOKIE_NAME, CODEX_LOGIN_COOKIE_NAME } from '../../cookie';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as typeof globalThis & { oswCodexCallbackServer?: Promise<void> }).oswCodexCallbackServer;
});

describe('Codex interactive login', () => {
  it('starts browser PKCE with automatic callback for localhost', async () => {
    (globalThis as typeof globalThis & { oswCodexCallbackServer?: Promise<void> }).oswCodexCallbackServer = Promise.resolve();

    const start = await POST(new NextRequest('http://localhost/api/auth/codex/connect', { method: 'POST' }));
    const login = await start.json();
    const authUrl = new URL(login.authorizationUrl);

    expect(login.manualCallback).toBe(false);
    expect(authUrl.pathname).toBe('/oauth/authorize');
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('accepts a copied redirect URL when the callback server is remote', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      json({ access_token: 'remote-access', refresh_token: 'remote-refresh', expires_in: 3600 }),
    ));

    const start = await POST(new NextRequest('https://example.hf.space/api/auth/codex/connect', { method: 'POST' }));
    const flowCookie = start.cookies.get(CODEX_LOGIN_COOKIE_NAME)?.value;
    const login = await start.json();
    const state = new URL(login.authorizationUrl).searchParams.get('state');
    expect(login.manualCallback).toBe(true);

    const complete = await PATCH(new NextRequest('https://example.hf.space/api/auth/codex/connect', {
      method: 'PATCH',
      headers: {
        cookie: `${CODEX_LOGIN_COOKIE_NAME}=${flowCookie}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ redirectUrl: `http://localhost:1455/auth/callback?code=remote-code&state=${state}` }),
    }));

    expect(await complete.json()).toMatchObject({ access_token: 'remote-access' });
    expect(complete.cookies.get(CODEX_COOKIE_NAME)?.value).toBe('remote-refresh');
  });
});
