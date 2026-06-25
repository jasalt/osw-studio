import { vfs } from '@/lib/vfs';
import { configManager } from '@/lib/config/storage';
import type { ProjectModelConfig, ModelAssignment } from './assignment';

/**
 * Set which template the project uses, clearing any per-project slot overrides —
 * switching templates starts from that template's models, not the old overrides.
 */
export async function setProjectTemplate(
  projectId: string,
  templateId: string,
): Promise<ProjectModelConfig> {
  const proj = await vfs.getProject(projectId);
  const models: ProjectModelConfig = { templateId, overrides: {} };
  proj.settings = { ...proj.settings, models };
  await vfs.updateProject(proj);
  return models;
}

/**
 * Set a single slot override, leaving all other overrides and templateId intact.
 */
export async function setProjectSlotOverride<K extends keyof ModelAssignment>(
  projectId: string,
  slot: K,
  value: ModelAssignment[K],
): Promise<ProjectModelConfig> {
  const proj = await vfs.getProject(projectId);
  const current: ProjectModelConfig = proj.settings?.models ?? {
    templateId: configManager.getDefaultTemplateId(),
    overrides: {},
  };
  const models: ProjectModelConfig = {
    templateId: current.templateId,
    overrides: { ...current.overrides, [slot]: value },
  };
  proj.settings = { ...proj.settings, models };
  await vfs.updateProject(proj);
  return models;
}

/**
 * Drop all slot overrides, keeping the templateId intact.
 */
export async function clearProjectOverrides(
  projectId: string,
): Promise<ProjectModelConfig> {
  const proj = await vfs.getProject(projectId);
  const current: ProjectModelConfig = proj.settings?.models ?? {
    templateId: configManager.getDefaultTemplateId(),
    overrides: {},
  };
  const models: ProjectModelConfig = {
    templateId: current.templateId,
    overrides: {},
  };
  proj.settings = { ...proj.settings, models };
  await vfs.updateProject(proj);
  return models;
}
