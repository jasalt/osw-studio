import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import JSZip from 'jszip';

// exportProjectAsZip compiles the project via VirtualServer, which creates blob
// URLs (URL.createObjectURL) for assets. That API doesn't exist in the node test
// runtime, so polyfill it deterministically BEFORE importing the VFS. Each call
// returns a unique blob: URL; the export must map these back to real paths.
let blobCounter = 0;
const objectUrls = new Map<string, unknown>();
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
URL.createObjectURL = (obj: unknown) => {
  const url = `blob:test/${blobCounter++}`;
  objectUrls.set(url, obj);
  return url;
};
URL.revokeObjectURL = (url: string) => { objectUrls.delete(url); };

const { vfs } = await import('../index');

describe('exportProjectAsZip is self-contained (issue #12)', () => {
  beforeAll(async () => {
    await vfs.init();
  });

  afterAll(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('strips preview scripts and restores real asset paths (no blob: URLs)', async () => {
    const project = await vfs.createProject('Zip Export', 'test');
    project.settings = { ...project.settings, runtime: 'static' };
    await vfs.updateProject(project);

    await vfs.createFile(
      project.id,
      '/index.html',
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="/styles/app.css"></head>' +
        '<body><img src="/logo.png"><script src="/scripts/main.js"></script></body></html>'
    );
    await vfs.createFile(project.id, '/styles/app.css', 'body { color: red; }');
    await vfs.createFile(project.id, '/scripts/main.js', 'console.log("hi");');
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 9, 8, 7]);
    await vfs.createFile(project.id, '/logo.png', pngBytes.buffer);

    const blob = await vfs.exportProjectAsZip(project.id);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    const indexEntry = zip.file('index.html');
    expect(indexEntry).not.toBeNull();
    const html = await indexEntry!.async('string');

    // No preview instrumentation leaked into the export.
    expect(html).not.toContain('VFS Asset Interceptor');
    expect(html).not.toContain('Console Capture');
    // No instance-local blob URLs — the whole point of the fix.
    expect(html).not.toContain('blob:');
    // Real, root-relative asset references are preserved.
    expect(html).toContain('href="/styles/app.css"');
    expect(html).toContain('src="/logo.png"');
    expect(html).toContain('src="/scripts/main.js"');

    // The binary asset is actually present in the zip with its original bytes.
    const logoEntry = zip.file('logo.png');
    expect(logoEntry).not.toBeNull();
    const logoBytes = new Uint8Array(await logoEntry!.async('arraybuffer'));
    expect(Array.from(logoBytes)).toEqual(Array.from(pngBytes));
  });
});
