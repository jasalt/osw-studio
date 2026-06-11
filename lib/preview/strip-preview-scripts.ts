/**
 * Remove live-preview-only instrumentation from compiled HTML.
 *
 * The preview engine injects two scripts into every page: the VFS Asset
 * Interceptor and the Console Capture bridge. They are only meaningful inside
 * the preview iframe — published output and shell `curl` reads must not
 * contain them (they waste tokens and confuse the model into thinking the
 * project owns that code).
 */
export function stripPreviewScripts(html: string): string {
  const vfsRegex = /<script>\s*\/\/ VFS Asset Interceptor[\s\S]*?<\/script>\s*/;
  html = html.replace(vfsRegex, '');

  const consoleRegex = /<script>\s*\/\/ Console Capture[\s\S]*?<\/script>\s*/;
  html = html.replace(consoleRegex, '');

  return html;
}
