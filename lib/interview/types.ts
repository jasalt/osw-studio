import type { TestAssertion } from '@/lib/testing/types';

/**
 * Interview template types. Completion of each item is verified by the harness
 * (the completion gate), reusing the benchmark TestAssertion machinery.
 */

export interface InterviewItem {
  /** Stable id, used in the agenda and for per-item completion feedback. */
  id: string;
  /** What to gather from the user (the agent's instruction for this item). */
  elicit: string;
  /** How the harness verifies the item is satisfied (file checks and/or judge). */
  completion: TestAssertion[];
  /** Required items gate completion; optional items are nice-to-have. Defaults to true. */
  required?: boolean;
}

/** An action offered to the user when an interview completes. */
export interface InterviewHandoff {
  label: string;
  prompt: string;
  mode: 'code' | 'chat';
}

export interface InterviewTemplate {
  id: string;
  title: string;
  description: string;
  items: InterviewItem[];
  /** The artifact(s) the interview produces, under /.interviews/. */
  artifacts: { path: string; description?: string }[];
  /** Optional action offered when the interview completes. */
  handoff?: InterviewHandoff;
}
