import { describe, it, expect, vi } from 'vitest';

const mockVfs = {
  init: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  createFile: vi.fn(),
  listFiles: vi.fn().mockResolvedValue([]),
  listDirectories: vi.fn().mockResolvedValue([]),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  getFileTree: vi.fn().mockResolvedValue([]),
};

vi.mock('@/lib/vfs', () => ({
  getActiveVFS: () => mockVfs,
  vfs: mockVfs,
}));

vi.mock('@/lib/utils', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('cli-shell status command', () => {
  it('acknowledges without echoing task/done text back (token duplication)', async () => {
    const { vfsShell } = await import('../cli-shell');

    const result = await vfsShell.execute('test-project', [
      'status', '--task', 'build the landing page', '--done', 'created index.html with hero and CTA', '--remaining', 'none', '--complete',
    ]);

    expect(result.success).toBe(true);
    // Machine-readable lines the loop depends on
    expect(result.stdout).toMatch(/^Remaining:\s*none/m);
    expect(result.stdout).toMatch(/^Complete:\s*yes/m);
    // No verbatim echo of the long fields
    expect(result.stdout).not.toContain('created index.html with hero and CTA');
    expect(result.stdout).not.toContain('build the landing page');
  });

  it('reports Complete: no without the --complete flag', async () => {
    const { vfsShell } = await import('../cli-shell');

    const result = await vfsShell.execute('test-project', [
      'status', '--task', 't', '--done', 'd', '--remaining', 'fix nav',
    ]);

    expect(result.stdout).toMatch(/^Remaining:\s*fix nav/m);
    expect(result.stdout).toMatch(/^Complete:\s*no/m);
  });
});
