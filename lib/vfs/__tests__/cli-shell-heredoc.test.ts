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

describe('cli-shell heredoc path detection', () => {
  it('returns error when << appears as a file path in cat', async () => {
    const { vfsShell } = await import('../cli-shell');

    const result = await vfsShell.execute('test-project', ['cat', '<<']);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('heredoc syntax error');
    expect(result.stderr).toContain('separate tool call');
  });

  it('returns error when <<EOF appears as a file path in cat', async () => {
    const { vfsShell } = await import('../cli-shell');

    const result = await vfsShell.execute('test-project', ['cat', "<<'EOF'"]);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('heredoc syntax error');
  });
});
