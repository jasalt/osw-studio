import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVfs = {
  init: vi.fn(),
  getAllFilesAndDirectories: vi.fn().mockResolvedValue([]),
};

vi.mock('@/lib/vfs', () => ({
  getActiveVFS: () => mockVfs,
  vfs: mockVfs,
}));

vi.mock('@/lib/utils', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

async function exec(cmd: string[], stdin?: string) {
  const { vfsShell } = await import('../cli-shell');
  return vfsShell.execute('test', cmd, stdin);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVfs.getAllFilesAndDirectories.mockResolvedValue([
    { path: '/data.json', type: 'file' },
    { path: '/index.html', type: 'file' },
    { path: '/styles', type: 'directory' },
    { path: '/styles/app.css', type: 'file' },
  ]);
});

describe('find with a relative current-directory root', () => {
  it('find . resolves to the project root (not the literal path /.)', async () => {
    const result = await exec(['find', '.', '-type', 'f']);
    expect(result.stdout).toContain('/data.json');
    expect(result.stdout).toContain('/index.html');
    expect(result.stdout).toContain('/styles/app.css');
  });

  it('find ./styles resolves under the root', async () => {
    const result = await exec(['find', './styles', '-type', 'f']);
    expect(result.stdout).toContain('/styles/app.css');
    expect(result.stdout).not.toContain('/data.json');
  });
});
