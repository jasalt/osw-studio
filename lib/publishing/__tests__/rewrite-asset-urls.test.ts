import { describe, it, expect } from 'vitest';
import { replaceBlobUrlsWithPaths } from '../rewrite-asset-urls';

describe('replaceBlobUrlsWithPaths', () => {
  it('restores a blob URL back to its root-relative path', () => {
    const map = new Map([
      ['blob:https://otst-osw-studio.hf.space/abc-123', '/myimage.png'],
    ]);
    const html = '<img src="blob:https://otst-osw-studio.hf.space/abc-123">';
    expect(replaceBlobUrlsWithPaths(html, map)).toBe('<img src="/myimage.png">');
  });

  it('replaces every occurrence of the same blob URL', () => {
    const map = new Map([['blob:x/1', '/logo.png']]);
    const html = '<img src="blob:x/1"><img src="blob:x/1">';
    expect(replaceBlobUrlsWithPaths(html, map)).toBe(
      '<img src="/logo.png"><img src="/logo.png">'
    );
  });

  it('rewrites blob URLs inside CSS url() references', () => {
    const map = new Map([['blob:x/2', '/styles/bg.jpg']]);
    const css = '.hero { background: url(blob:x/2); }';
    expect(replaceBlobUrlsWithPaths(css, map)).toBe(
      '.hero { background: url(/styles/bg.jpg); }'
    );
  });

  it('handles multiple distinct blob URLs', () => {
    const map = new Map([
      ['blob:x/img', '/photo.png'],
      ['blob:x/js', '/scripts/main.js'],
    ]);
    const html = '<img src="blob:x/img"><script src="blob:x/js"></script>';
    expect(replaceBlobUrlsWithPaths(html, map)).toBe(
      '<img src="/photo.png"><script src="/scripts/main.js"></script>'
    );
  });

  it('leaves content without blob URLs unchanged', () => {
    const map = new Map([['blob:x/1', '/a.png']]);
    const html = '<img src="/a.png">';
    expect(replaceBlobUrlsWithPaths(html, map)).toBe(html);
  });

  it('returns content unchanged when the map is empty', () => {
    const html = '<img src="blob:x/1">';
    expect(replaceBlobUrlsWithPaths(html, new Map())).toBe(html);
  });
});
