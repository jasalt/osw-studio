'use client';

import { useEffect } from 'react';
import { configManager } from '@/lib/config/storage';
import { useWorkspaceStore } from '@/lib/stores/workspace';

/**
 * Bump the reactive model-config signal (modelConfigVersion in the workspace store) so
 * global model resolution recomputes across ANY subtree that subscribes to it: providerReady,
 * input modalities, and the chat-panel's effective agent model. The counter is bumped when a
 * provider connects (apiKeyUpdated) or the global template/default/provider-model changes
 * (modelConfigChanged).
 *
 * Mounted from BOTH mode roots (StudioInner in browser mode, PageWrapperInner in server mode)
 * so the signal is always live regardless of the current view. This is what lets ChatPanels
 * rendered OUTSIDE the Workspace subtree (describe-mode, project-manager) react to model picks;
 * the old per-Workspace listener never bumped the counter for those trees.
 *
 * Also runs configManager.migrateModels() ONCE at mount so getActiveTemplate /
 * resolveActiveAssignment never trigger a migration dispatch during a component's render on a
 * brand-new user's first open.
 */
export function useModelConfigSignal(): void {
  useEffect(() => {
    // One-time bootstrap migration so synchronous render-time resolvers never migrate mid-render.
    configManager.migrateModels();

    const bump = () => useWorkspaceStore.getState().bumpModelConfig();
    window.addEventListener('apiKeyUpdated', bump);
    window.addEventListener('modelConfigChanged', bump);
    return () => {
      window.removeEventListener('apiKeyUpdated', bump);
      window.removeEventListener('modelConfigChanged', bump);
    };
  }, []);
}
