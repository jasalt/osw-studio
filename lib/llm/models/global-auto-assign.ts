import { configManager } from '@/lib/config/storage';
import { getDefaultModel } from '@/lib/llm/providers/registry';
import type { ProviderId } from '@/lib/llm/providers/types';
import { BUILT_IN_MODEL_TEMPLATES } from './registry';
import { loadProviderModels } from './model-catalog';
import { pickModelForProvider, shouldAutoAssignAgent } from './project-assignment';

/**
 * Make `provider` the GLOBAL active model. This is the onboarding auto-assign path:
 * when a user connects a provider and no working model is selected yet, point the
 * single global active template at that provider so every project inherits it.
 *
 * Prefer the provider's built-in Recommended template (synchronous, no model load);
 * otherwise rewrite the editable `default` template's agent to a sensible model for
 * that provider and activate it. Both configManager writes dispatch modelConfigChanged,
 * which drives workspace reactivity.
 */
export async function activateProviderAsGlobalDefault(provider: ProviderId): Promise<void> {
  const recommended = BUILT_IN_MODEL_TEMPLATES.find((t) => t.assignment.agent.provider === provider);
  if (recommended) {
    configManager.setDefaultTemplateId(recommended.id);
    return;
  }

  const models = await loadProviderModels(provider);
  // Re-check after the async load: config may have changed (another connect) meanwhile.
  if (!shouldAutoAssignAgent()) return;

  const model = pickModelForProvider(getDefaultModel(provider), models.map((m) => m.id));
  if (!model) return; // do not assign an empty model (e.g. custom provider with no models)

  // Accepted narrow edge: the readiness guard keys on provider credentials, not on whether the
  // user deliberately customized default's agent. A user who set default's agent to a specific
  // model of a provider they had NOT yet keyed, then connects that provider, will have that
  // specific model replaced by pickModelForProvider's choice here. The outcome is still a working
  // model, so this is accepted rather than special-cased.

  const base = configManager.getModelTemplate('default');
  if (!base) return; // default exists post-migration; bail rather than fabricate one

  configManager.saveModelTemplate({
    ...base,
    id: 'default',
    builtin: false,
    assignment: { ...base.assignment, agent: { provider, model } },
  });
  configManager.setDefaultTemplateId('default');
}
