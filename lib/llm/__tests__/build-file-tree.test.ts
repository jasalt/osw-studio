import { describe, it, expect } from 'vitest';
import { buildFileTree } from '../streaming-parser';
import type { VirtualFile } from '@/lib/vfs/types';

// buildFileTree only reads path + size; directories are implicit in paths
// (VFS listings contain no directory entries).
const file = (path: string, size = 100) => ({ path, size }) as VirtualFile;

describe('buildFileTree', () => {
  it('includes files in subdirectories even without explicit directory entries', () => {
    const tree = buildFileTree([
      file('/index.html'),
      file('/data.json'),
      file('/styles/style.css'),
      file('/scripts/main.js'),
      file('/templates/example.hbs'),
    ]);

    expect(tree).toContain('styles/');
    expect(tree).toContain('style.css');
    expect(tree).toContain('scripts/');
    expect(tree).toContain('main.js');
    expect(tree).toContain('templates/');
    expect(tree).toContain('example.hbs');
  });

  it('renders deeply nested paths', () => {
    const tree = buildFileTree([
      file('/templates/components/header.hbs'),
      file('/index.html'),
    ]);

    expect(tree).toContain('templates/');
    expect(tree).toContain('components/');
    expect(tree).toContain('header.hbs');
  });

  it('lists each directory once when it holds multiple files', () => {
    const tree = buildFileTree([
      file('/styles/a.css'),
      file('/styles/b.css'),
    ]);

    expect(tree.match(/styles\//g)).toHaveLength(1);
    expect(tree).toContain('a.css');
    expect(tree).toContain('b.css');
  });
});
