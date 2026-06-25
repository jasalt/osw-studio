import type { ModelRef } from '@/lib/llm/models/assignment';

/** Format context length as a concise string (e.g. "1M ctx", "200K ctx"). */
export function fmtCtx(length: number | undefined): string | null {
  if (!length) return null;
  if (length >= 1_000_000) {
    const val = length / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M ctx`;
  }
  return `${Math.round(length / 1_000)}K ctx`;
}

/** Short model id — the trailing segment after any vendor prefix. */
export function modelRefLabel(ref: ModelRef | null): string {
  if (!ref) return '';
  const parts = ref.model.split('/');
  return parts[parts.length - 1] ?? ref.model;
}
