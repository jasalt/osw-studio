import { configManager } from '@/lib/config/storage';
import type { ModelAssignment, ModelTemplate } from '@/lib/llm/models/assignment';

export function getActiveTemplate(): ModelTemplate {
  const id = configManager.getDefaultTemplateId();
  let t = configManager.getModelTemplate(id);
  if (!t) {
    configManager.migrateModels();
    t = configManager.getModelTemplate(id);
  }
  if (!t) throw new Error(`Active template "${id}" not found even after migration`);
  return t;
}

/**
 * Clone the given assignment (or the active template's, if none passed) into a
 * new editable template. Pass the working draft so unsaved edits are captured —
 * e.g. tweaking a read-only built-in and saving it as your own copy.
 */
export function saveAsTemplate(name: string, source?: ModelAssignment): ModelTemplate {
  const assignment = source ?? getActiveTemplate().assignment;
  const clone: ModelTemplate = {
    id: `t${Date.now()}`,
    name,
    builtin: false,
    assignment: JSON.parse(JSON.stringify(assignment)) as ModelAssignment,
  };
  configManager.saveModelTemplate(clone);
  // Re-read so the returned template carries the stamped updatedAt.
  return configManager.getModelTemplate(clone.id) ?? clone;
}
