const DEBUG = process.env.SERVER_GEN_DEBUG === 'true';

export function serverLog(...args: unknown[]) {
  if (DEBUG) console.log('[ServerGen]', ...args);
}
