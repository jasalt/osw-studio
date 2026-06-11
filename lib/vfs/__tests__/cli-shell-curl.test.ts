import { describe, it, expect, vi } from 'vitest';

const PREVIEW_HTML = `<!DOCTYPE html>
<html><head>
<script>
// Console Capture - Auto-injected by OSW Studio
(function() { var levels = ['log']; })();
</script>
<script>
// VFS Asset Interceptor
(function() { var map = {}; })();
</script>
<title>My Page</title>
</head><body>real content</body></html>`;

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
  getProject: vi.fn().mockResolvedValue({ id: 'test-project', settings: { runtime: 'static' } }),
};

vi.mock('@/lib/vfs', () => ({
  getActiveVFS: () => mockVfs,
  vfs: mockVfs,
}));

vi.mock('@/lib/utils', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/preview/virtual-server', () => ({
  VirtualServer: class {
    async getCompiledFile() {
      return { path: '/index.html', content: PREVIEW_HTML, mimeType: 'text/html' };
    }
  },
}));

describe('cli-shell curl command', () => {
  it('strips preview instrumentation from fetched pages', async () => {
    const { vfsShell } = await import('../cli-shell');

    const result = await vfsShell.execute('test-project', ['curl', '-s', 'localhost/']);

    expect(result.success).toBe(true);
    expect(result.stdout).not.toContain('Console Capture');
    expect(result.stdout).not.toContain('VFS Asset Interceptor');
    expect(result.stdout).toContain('<title>My Page</title>');
    expect(result.stdout).toContain('real content');
  });
});
