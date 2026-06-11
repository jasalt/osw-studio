import { describe, it, expect } from 'vitest';
import { stripPreviewScripts } from '../strip-preview-scripts';

const consoleCapture = `<script>
// Console Capture - Auto-injected by OSW Studio
(function() {
  if (window === window.parent) return;
  var levels = ['log', 'warn', 'error'];
})();
</script>
`;

const assetInterceptor = `<script>
// VFS Asset Interceptor
(function() {
  var map = {};
})();
</script>
`;

describe('stripPreviewScripts', () => {
  it('removes the Console Capture script', () => {
    const html = `<html><head>${consoleCapture}<title>X</title></head><body>hi</body></html>`;
    const out = stripPreviewScripts(html);
    expect(out).not.toContain('Console Capture');
    expect(out).toContain('<title>X</title>');
    expect(out).toContain('hi');
  });

  it('removes the VFS Asset Interceptor script', () => {
    const html = `<html><head>${assetInterceptor}</head><body>hi</body></html>`;
    const out = stripPreviewScripts(html);
    expect(out).not.toContain('VFS Asset Interceptor');
    expect(out).toContain('hi');
  });

  it('removes both and leaves user scripts alone', () => {
    const html = `<html><head>${consoleCapture}${assetInterceptor}</head><body><script>console.log('mine')</script></body></html>`;
    const out = stripPreviewScripts(html);
    expect(out).not.toContain('Console Capture');
    expect(out).not.toContain('VFS Asset Interceptor');
    expect(out).toContain("console.log('mine')");
  });

  it('returns non-instrumented HTML unchanged', () => {
    const html = '<html><body>plain</body></html>';
    expect(stripPreviewScripts(html)).toBe(html);
  });
});
