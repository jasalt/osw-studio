import { vfs } from '@/lib/vfs';
import { configManager } from '@/lib/config/storage';
import { getProvider } from '@/lib/llm/providers/registry';
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

/**
 * Whether the project's agent provider has the credentials needed to chat.
 * Resolves the provider from the per-project assignment, NOT the global
 * selectedProvider — so a project on one provider works even when the instance's
 * global default is a different, keyless provider (e.g. an OpenRouter project on
 * the HuggingFace Space, whose global default is HuggingFace).
 */
export function isProjectProviderReady(config: ProjectModelConfig | undefined): boolean {
  const agent = resolveProjectAssignment(config)?.agent;
  const provider = agent?.provider ?? configManager.getSelectedProvider();
  const providerConfig = getProvider(provider);
  if (providerConfig.isLocal) return true;
  if (providerConfig.apiKeyRequired || providerConfig.usesOAuth) {
    return !!configManager.getProviderApiKey(provider);
  }
  return true;
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
