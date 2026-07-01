import { describe, it, expect, beforeAll } from 'vitest';
import 'fake-indexeddb/auto';
import { vfs } from '../index';

// Exercises the real VFS export → JSON round-trip → import path to guard
// against binary assets and project settings being lost (issue #11).

describe('project export/import round-trip', () => {
  beforeAll(async () => {
    await vfs.init();
  });

  it('preserves binary files and project settings through JSON', async () => {
    const project = await vfs.createProject('Round Trip', 'test');
    project.settings = { ...project.settings, runtime: 'static' };
    await vfs.updateProject(project);

    await vfs.createFile(project.id, '/index.html', '<html><body>hi</body></html>');

    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 250]);
    await vfs.createFile(project.id, '/myimage.png', pngBytes.buffer);

    // Serialize exactly as the export UI does, then parse back.
    const exported = await vfs.exportProject(project.id);
    const roundTripped = JSON.parse(JSON.stringify(exported));

    const imported = await vfs.importProject(roundTripped);

    // Settings (runtime) survives instead of resetting to the legacy default.
    expect(imported.settings.runtime).toBe('static');

    // Text file content is intact.
    const html = await vfs.readFile(imported.id, '/index.html');
    expect(html.content).toBe('<html><body>hi</body></html>');

    // Binary file is restored to an ArrayBuffer with identical bytes.
    const img = await vfs.readFile(imported.id, '/myimage.png');
    expect(img.content).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(img.content as ArrayBuffer))).toEqual(
      Array.from(pngBytes)
    );
  });

  it('duplicateProject carries over project settings', async () => {
    const project = await vfs.createProject('Dup Settings', 'test');
    project.settings = { ...project.settings, runtime: 'static' };
    await vfs.updateProject(project);

    const copy = await vfs.duplicateProject(project.id);
    expect(copy.settings.runtime).toBe('static');
  });
});
