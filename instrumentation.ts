export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Dynamic imports — avoids bundling SQLite into client
      const { listDeploymentIds } = await import('@/lib/vfs/adapters/sqlite-connection');
      listDeploymentIds(); // Verify SQLite is available (throws in browser mode)

      const { Scheduler } = await import('@/lib/scheduler');
      const { createDeploymentSchedulerTask } = await import('@/lib/scheduler/deployment-scheduler');

      const scheduler = new Scheduler({ pollIntervalMs: 30000 });
      scheduler.registerTask(createDeploymentSchedulerTask());
      scheduler.start();
    } catch (err) {
      // Browser mode or SQLite not available — skip
      if (process.env.ADMIN_PASSWORD) {
        // Only log in server mode (ADMIN_PASSWORD indicates server deployment)
        console.warn('[Scheduler] Failed to initialize:', err instanceof Error ? err.message : err);
      }
    }

    // Rebuild the Caddy config from the deployment routing table on boot, so a
    // freshly (re)deployed instance serves every existing deployment subdomain
    // without waiting for the next publish to regenerate it. No-op unless
    // STATIC_PROXY=true.
    try {
      const { regenerateInstanceCaddy } = await import('@/lib/caddy/regenerate');
      await regenerateInstanceCaddy();
    } catch (err) {
      if (process.env.ADMIN_PASSWORD) {
        console.warn('[Caddy] Startup regeneration failed:', err instanceof Error ? err.message : err);
      }
    }
  }
}
