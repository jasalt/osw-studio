import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Route-level auth guard for /api/server-generate/*. This locks the behavior that
 * regressed once: the desktop app runs in Server Mode but never issues an
 * `osw_session` cookie (it only sets `osw_workspace`), so generation and its live
 * event stream must authenticate through the desktop-aware `getSession()` (which
 * returns a synthetic session when `OSW_DESKTOP=true`). The bug was that each route
 * read the cookie directly and 401'd on desktop, breaking all server-side generation.
 *
 * The meaningful signal is the status code: with a desktop environment and NO cookie
 * the route must NOT return 401 (auth passes); without desktop mode and no cookie it
 * must return 401.
 */

// The desktop app never sets osw_session. cookies() returns nothing.
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

// Neutralize the server-generation singletons so importing the routes is
// side-effect-free and post-auth logic has no real infrastructure to touch.
vi.mock('@/lib/server-generate/singleton', () => ({
  taskManager: {
    getTasksForSession: () => [],
    getTask: () => undefined,
    createTask: () => 'task-1',
  },
  eventBus: {
    getBuffer: () => [],
    replayFrom: () => [],
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

// Don't actually run a generation when the POST route passes auth.
vi.mock('@/lib/server-generate/server-orchestrator-runner', () => ({
  runServerGeneration: vi.fn(),
}));

function makeReq(opts: { body?: unknown; url?: string } = {}): NextRequest {
  const controller = new AbortController();
  return {
    // After the fix routes authenticate via getSession(); request.cookies is unused
    // for auth but kept here so nothing throws if a route reads it.
    cookies: { get: () => undefined },
    headers: new Headers(),
    nextUrl: new URL(opts.url ?? 'http://localhost/api/server-generate'),
    signal: controller.signal,
    json: async () => {
      if (opts.body === undefined) throw new Error('no body');
      return opts.body;
    },
  } as unknown as NextRequest;
}

const ORIGINAL_DESKTOP = process.env.OSW_DESKTOP;

beforeEach(() => {
  delete process.env.OSW_DESKTOP;
  vi.clearAllMocks();
});
afterEach(() => {
  if (ORIGINAL_DESKTOP === undefined) delete process.env.OSW_DESKTOP;
  else process.env.OSW_DESKTOP = ORIGINAL_DESKTOP;
});

describe('server-generate routes authenticate in desktop mode without a session cookie', () => {
  it('POST /api/server-generate: 401 without desktop, not 401 with OSW_DESKTOP', async () => {
    const { POST } = await import('../route');

    const denied = await POST(makeReq({ body: {} }));
    expect(denied.status).toBe(401);

    process.env.OSW_DESKTOP = 'true';
    const allowed = await POST(makeReq({ body: {} }));
    // Passes auth, then fails validation on the empty body (400). The point is: not 401.
    expect(allowed.status).not.toBe(401);
  });

  it('GET /api/server-generate/status: 401 without desktop, 200 with OSW_DESKTOP', async () => {
    const { GET } = await import('../status/route');

    const denied = await GET(makeReq({ url: 'http://localhost/api/server-generate/status' }));
    expect(denied.status).toBe(401);

    process.env.OSW_DESKTOP = 'true';
    const allowed = await GET(makeReq({ url: 'http://localhost/api/server-generate/status' }));
    expect(allowed.status).toBe(200);
  });

  // The mutation routes all read the body immediately after auth, so an empty body
  // yields 400 once auth passes, never 401 in desktop mode.
  it.each([
    ['cancel', () => import('../cancel/route')],
    ['pause', () => import('../pause/route')],
    ['resume', () => import('../resume/route')],
    ['build-result', () => import('../build-result/route')],
  ])('POST /api/server-generate/%s: 401 without desktop, not 401 with OSW_DESKTOP', async (_name, load) => {
    const { POST } = await load();

    const denied = await POST(makeReq());
    expect(denied.status).toBe(401);

    process.env.OSW_DESKTOP = 'true';
    const allowed = await POST(makeReq());
    expect(allowed.status).not.toBe(401);
  });

  it('GET /api/server-generate/events: 401 without desktop, streams (200) with OSW_DESKTOP', async () => {
    const { GET } = await import('../events/route');

    const denied = await GET(makeReq({ url: 'http://localhost/api/server-generate/events' }));
    expect(denied.status).toBe(401);

    // Fake timers so the stream's keepalive interval does not leak past the test.
    vi.useFakeTimers();
    try {
      process.env.OSW_DESKTOP = 'true';
      const allowed = await GET(makeReq({ url: 'http://localhost/api/server-generate/events' }));
      expect(allowed.status).toBe(200);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
