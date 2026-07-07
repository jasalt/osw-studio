import { configManager } from '@/lib/config/storage';
import type { ModelAssignment, ModelTemplate } from '@/lib/llm/models/assignment';
import type { ResolvedAssignment } from './assignment';

// Resolve the active template. Delegates to configManager.getActiveModelTemplate, which owns the
// single fallback chain (migrateModels-then-retry, then default -> or-recommended) so a dangling
// defaultTemplateId never crashes synchronous render callers (resolveActiveAssignment /
// isProjectProviderReady), e.g. when an active user template was deleted on another device and synced in.
export function getActiveTemplate(): ModelTemplate {
  return configManager.getActiveModelTemplate();
}

// Resolve the global working (effective) model selection. This is the working-selection
// layer: getActiveAssignment() returns the persisted working selection if set, else falls
// back to the active template's assignment. It already returns a shallow copy so callers
// can never mutate stored state. getActiveTemplate() stays as the template itself (the footer
// diffs working vs getActiveTemplate().assignment for dirty state).
export function resolveActiveAssignment(): ResolvedAssignment {
  return configManager.getActiveAssignment();
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
