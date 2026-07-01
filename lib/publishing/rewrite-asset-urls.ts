/**
 * Restore real asset paths in compiled output.
 *
 * VirtualServer.compileProject() rewrites internal asset references (img src,
 * link href, CSS url()) into blob: URLs so the live preview can serve them from
 * memory. Those blob URLs are tied to the browser/instance that produced them,
 * so any exported or published copy must map them back to the original file
 * paths. Callers pass a reverse map of blobUrl -> filePath (root-relative).
 */
export function replaceBlobUrlsWithPaths(
  content: string,
  blobUrlToPath: Map<string, string>
): string {
  let result = content;
  for (const [blobUrl, filePath] of blobUrlToPath) {
    result = result.split(blobUrl).join(filePath);
  }
  return result;
}
