/**
 * Retry a dynamic import once on failure. Webpack chunks can be invalidated
 * by HMR between the time a module is loaded and the time it lazily imports a
 * dependency — the first attempt fails with a chunk load error, the retry
 * fetches the fresh chunk.
 */
export async function importWithRetry<T>(importer: () => Promise<T>): Promise<T> {
  try {
    return await importer();
  } catch {
    return await importer();
  }
}
