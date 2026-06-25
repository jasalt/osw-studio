import { vfs } from '@/lib/vfs';
import { configManager } from '@/lib/config/storage';
import { resolveAssignment, type ResolvedAssignment, type ProjectModelConfig } from './assignment';

/**
 * Sync resolution from an in-hand config (the workspace store's
 * `projectModelConfig`) — no VFS read. Falls back to the Default template.
 * Returns null only if no template exists at all (migration never ran).
 */
export function resolveProjectAssignment(config: ProjectModelConfig | undefined): ResolvedAssignment | null {
  const templateId = config?.templateId || configManager.getDefaultTemplateId();
  const template = configManager.getModelTemplate(templateId)
    || configManager.getModelTemplate(configManager.getDefaultTemplateId());
  return template ? resolveAssignment(template, config) : null;
}

export async function getProjectAssignment(projectId: string): Promise<ResolvedAssignment> {
  // ensure the Default template exists (one-time, idempotent); part B also runs this on settings load
  configManager.migrateModels();
  const project = await vfs.getProject(projectId).catch(() => null);
  const cfg = project?.settings?.models as ProjectModelConfig | undefined;
  const templateId = cfg?.templateId || configManager.getDefaultTemplateId();
  const template = configManager.getModelTemplate(templateId)
    || configManager.getModelTemplate(configManager.getDefaultTemplateId());
  if (!template) throw new Error('No model template available (migration did not run?)');
  return resolveAssignment(template, cfg);
}
