import { configManager } from '@/lib/config/storage';
import { getDefaultModel } from '@/lib/llm/providers/registry';
import type { ProviderId } from '@/lib/llm/providers/types';
import { isProviderConnected, getConnectedProviders } from '@/lib/llm/providers/connection-status';
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

/**
 * Load-time counterpart to the connect-time auto-assign. The connect-time path only fires on the
 * `apiKeyUpdated` event, so a user who is ALREADY connected when the app loads is never reconciled.
 * That leaves a real gap: the pre-global migration seeds the Default template's agent from
 * `getSelectedProvider()` (a keyless default when the user's real provider was stored per-project),
 * so `isProjectProviderReady()` is false even though a provider is genuinely connected. The onboarding
 * UI then keys off that — showing the HF "Sign in" button and disabling the composer — until the user
 * deletes and re-adds the connection (which fires `apiKeyUpdated`). See issue #17.
 *
 * When the active agent provider is unready but a provider IS connected, point the global default at a
 * connected provider (preferring the globally selected one). No-op when the active agent is already
 * ready, or when nothing is connected (a genuine new user, whose onboarding UI must stay as-is).
 */
export async function reconcileActiveProviderIfConnected(): Promise<void> {
  if (!shouldAutoAssignAgent()) return; // active agent already ready — don't clobber the user's choice
  const selected = configManager.getSelectedProvider();
  const target = isProviderConnected(selected) ? selected : getConnectedProviders()[0];
  if (!target) return; // genuine new user: leave onboarding as-is
  await activateProviderAsGlobalDefault(target);
}
