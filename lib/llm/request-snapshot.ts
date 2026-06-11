/**
 * Request snapshot store — debug capture of the exact message history sent to
 * the provider on the most recent LLM call.
 *
 * Deliberately separate from the debug event stream: capture is a single
 * assignment per provider call (never per token), is session-only (never
 * persisted), and is off by default. The Messages tab in the debug panel
 * subscribes via useSyncExternalStore and re-renders only when a new request
 * is captured.
 */

import type { Message } from './core/types';

export interface RequestSnapshot {
  messages: Message[];
  provider: string;
  model: string;
  timestamp: number;
}

type Listener = () => void;

class RequestSnapshotStore {
  private enabled = false;
  private snapshot: RequestSnapshot | null = null;
  private listeners = new Set<Listener>();

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.notify();
  }

  /** Capture the latest outgoing request. No-op when disabled. */
  capture(req: { messages: Message[]; provider: string; model: string }): void {
    if (!this.enabled) return;
    this.snapshot = {
      // Deep copy — the live message objects are mutated by later turns
      messages: JSON.parse(JSON.stringify(req.messages)),
      provider: req.provider,
      model: req.model,
      timestamp: Date.now(),
    };
    this.notify();
  }

  /** Stable reference between captures (useSyncExternalStore contract). */
  getSnapshot(): RequestSnapshot | null {
    return this.snapshot;
  }

  clear(): void {
    if (this.snapshot === null) return;
    this.snapshot = null;
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const requestSnapshotStore = new RequestSnapshotStore();
