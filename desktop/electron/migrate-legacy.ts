/**
 * One-time legacy data rescue. Versions ≤1.75 stored data inside the install
 * directory; if that data is still reachable, copy it to the user-data
 * location before first use.
 *
 * Electron-free so it can be unit tested — the caller injects logging.
 */

import * as fs from 'fs';

export function migrateLegacyDir(
  legacyDir: string,
  targetDir: string,
  log: (message: string) => void,
): void {
  try {
    // Old shells pre-created the target as an EMPTY directory (without ever
    // telling the server to use it) — treat empty as absent, or the migration
    // would never run for anyone who launched an older version.
    const targetHasData = fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0;
    if (targetHasData || !fs.existsSync(legacyDir)) return;
    fs.cpSync(legacyDir, targetDir, { recursive: true });
    log(`Migrated legacy data: ${legacyDir} -> ${targetDir}`);
  } catch (err) {
    log(`Legacy data migration failed for ${legacyDir}: ${(err as Error)?.message || err}`);
  }
}
