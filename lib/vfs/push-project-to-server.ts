import { toast } from 'sonner';
import { vfs } from '@/lib/vfs';
import { getSyncManager } from '@/lib/vfs/sync-manager';
import { logger } from '@/lib/utils';

/**
 * Push a project to the server so it becomes deployable.
 *
 * In Server Mode a project only reaches the server (and the server-backed
 * deployment picker) when it is pushed. Newly imported or duplicated projects
 * live in IndexedDB only until then. Uses the same binary-safe push as the
 * Server Sync dialog. No-op in browser mode.
 */
export async function pushProjectToServer(projectId: string, workspaceId?: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_SERVER_MODE !== 'true') return;
  try {
    const project = await vfs.getProject(projectId);
    if (!project) return;
    const files = await vfs.listFiles(projectId);
    const result = await getSyncManager(workspaceId).pushSingleProject(projectId, project, files);
    if (result.success && result.project) {
      // Record sync metadata so a later refresh doesn't flag a false conflict.
      project.lastSyncedAt = new Date();
      project.serverUpdatedAt = result.project.updatedAt
        ? new Date(result.project.updatedAt)
        : new Date();
      await vfs.updateProject(project, { preserveUpdatedAt: true });
    } else if (!result.success) {
      logger.error('[pushProjectToServer] Failed to push project to server:', result.error);
      toast.error('Saved locally, but syncing to the server failed. Use Server Sync to retry.');
    }
  } catch (error) {
    logger.error('[pushProjectToServer] Failed to push project to server:', error);
  }
}
