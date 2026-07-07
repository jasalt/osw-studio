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

export type ResolvedAssignment = ModelAssignment;
