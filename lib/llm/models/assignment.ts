import type { ProviderId } from '@/lib/llm/providers/types';

export type ModelRef = { provider: ProviderId; model: string };

export interface ModelAssignment {
  agent: ModelRef;                          // required
  imageGen: ModelRef | 'agent' | null;      // model · reuse agent · off
  voiceInput: ModelRef | 'agent' | 'browser' | null;  // model · reuse agent · on-device · off
  autoCompact: boolean;                     // seeded at migration; read-wiring lands in part B
  compactLimit: number | null;              // null = auto (60% of agent ctx); read-wiring in part B
}

export interface ModelTemplate {
  id: string;
  name: string;
  builtin?: boolean;
  description?: string;
  assignment: ModelAssignment;
  // Timestamps for server sync (user templates only; built-ins never sync).
  updatedAt?: Date;       // bumped on every content edit
  lastSyncedAt?: Date;    // when this template last synced with the server
  serverUpdatedAt?: Date; // the server's updatedAt at last sync
}

export interface ProjectModelConfig {
  templateId: string;
  overrides?: Partial<ModelAssignment>;
}

export type ResolvedAssignment = ModelAssignment;

// Pure: apply a project's per-slot overrides onto a template's assignment.
// hasOwnProperty so an explicit null/sentinel override wins over the template.
export function resolveAssignment(
  template: ModelTemplate,
  config: ProjectModelConfig | undefined,
): ResolvedAssignment {
  const base = template.assignment;
  const ov = config?.overrides;
  if (!ov) return { ...base };
  const out = { ...base };
  (Object.keys(ov) as Array<keyof ModelAssignment>).forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(ov, k)) {
      (out as Record<string, unknown>)[k] = ov[k];
    }
  });
  return out;
}
