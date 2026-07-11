import { describe, it, expect, vi } from 'vitest';
import { compileStaticSite, TerminalRuntimeError } from '@/lib/publishing/compile-static-site';

function fakeVfs(runtime: string) {
  return {
    getProject: vi.fn().mockResolvedValue({ id: 'p1', name: 'P', settings: { runtime } }),
  } as any;
}

describe('compileStaticSite', () => {
  it('throws TerminalRuntimeError for terminal runtimes (python/lua)', async () => {
    await expect(compileStaticSite(fakeVfs('python'), 'p1')).rejects.toBeInstanceOf(TerminalRuntimeError);
  });
});
