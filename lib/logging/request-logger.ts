/**
 * Request Stats & Cleanup
 *
 * Reads from the request_log table for the admin dashboard
 * and handles log retention cleanup.
 */

// Lazy-loaded database connection
let db: ReturnType<typeof import('../vfs/adapters/sqlite-connection').getCoreDatabase> | null = null;

/**
 * Get database connection lazily
 */
function getDB() {
  if (!db) {
    // Lazy require keeps better-sqlite3 (native module) out of non-server
    // bundles; getDB() is sync so dynamic import() is not an option here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCoreDatabase } = require('../vfs/adapters/sqlite-connection');
    db = getCoreDatabase();
  }
  return db;
}


/**
 * Get request statistics for dashboard
 */
export function getRequestStats(hoursBack: number = 24): {
  requestsLastHour: number;
  requestsLastDay: number;
  errorCount: number;
  topDeployments: Array<{ deploymentId: string; count: number }>;
  recentErrors: Array<{ deploymentId: string; path: string; statusCode: number; timestamp: string }>;
} {
  try {
    const database = getDB();
    if (!database) {
      return {
        requestsLastHour: 0,
        requestsLastDay: 0,
        errorCount: 0,
        topDeployments: [],
        recentErrors: [],
      };
    }

    // Requests in last hour
    const lastHour = database.prepare(`
      SELECT COUNT(*) as count FROM request_log
      WHERE timestamp > datetime('now', '-1 hour')
    `).get() as { count: number };

    // Requests in last 24 hours
    const lastDay = database.prepare(`
      SELECT COUNT(*) as count FROM request_log
      WHERE timestamp > datetime('now', '-24 hours')
    `).get() as { count: number };

    // Error count (4xx and 5xx) in last 24 hours
    const errors = database.prepare(`
      SELECT COUNT(*) as count FROM request_log
      WHERE timestamp > datetime('now', '-24 hours')
      AND status_code >= 400
    `).get() as { count: number };

    // Top deployments by request count in last 24 hours
    const topDeployments = database.prepare(`
      SELECT site_id as deploymentId, COUNT(*) as count FROM request_log
      WHERE timestamp > datetime('now', '-24 hours')
      GROUP BY site_id
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ deploymentId: string; count: number }>;

    // Recent errors
    const recentErrors = database.prepare(`
      SELECT site_id as deploymentId, path, status_code as statusCode, timestamp FROM request_log
      WHERE status_code >= 400
      ORDER BY timestamp DESC
      LIMIT 10
    `).all() as Array<{ deploymentId: string; path: string; statusCode: number; timestamp: string }>;

    return {
      requestsLastHour: lastHour.count,
      requestsLastDay: lastDay.count,
      errorCount: errors.count,
      topDeployments,
      recentErrors,
    };
  } catch (error) {
    console.error('[RequestLogger] Failed to get stats:', error);
    return {
      requestsLastHour: 0,
      requestsLastDay: 0,
      errorCount: 0,
      topDeployments: [],
      recentErrors: [],
    };
  }
}

/**
 * Clean up old request logs to prevent unbounded growth
 * Keeps logs from the last N days
 */
export function cleanupOldLogs(daysToKeep: number = 7): number {
  try {
    const database = getDB();
    if (!database) return 0;

    const result = database.prepare(`
      DELETE FROM request_log
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).run(daysToKeep);

    return result.changes;
  } catch (error) {
    console.error('[RequestLogger] Failed to cleanup logs:', error);
    return 0;
  }
}
