import { defineConfig } from 'tsup';

// Compiles the Electron main process into the assembled app/ directory
// (created by assemble-app.sh from the Next.js standalone build).
export default defineConfig({
  entry: ['electron/main.ts'],
  outDir: 'app',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  clean: false,
  external: ['electron', /^next\//],
  noExternal: ['get-port-please', 'electron-updater'],
});
