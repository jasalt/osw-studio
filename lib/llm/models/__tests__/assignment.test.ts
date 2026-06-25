import { describe, it, expect } from 'vitest';
import { resolveAssignment, type ModelTemplate, type ProjectModelConfig } from '@/lib/llm/models/assignment';

const tpl: ModelTemplate = {
  id: 'default', name: 'Default',
  assignment: {
    agent: { provider: 'openrouter', model: 'x/y' },
    imageGen: null, voiceInput: 'browser', autoCompact: true, compactLimit: null,
  },
};

describe('resolveAssignment', () => {
  it('returns the template assignment when there are no overrides', () => {
    expect(resolveAssignment(tpl, undefined)).toEqual(tpl.assignment);
  });
  it('applies per-slot overrides over the template', () => {
    const cfg: ProjectModelConfig = { templateId: 'default', overrides: { agent: { provider: 'openai', model: 'gpt' } } };
    const r = resolveAssignment(tpl, cfg);
    expect(r.agent).toEqual({ provider: 'openai', model: 'gpt' });
    expect(r.voiceInput).toBe('browser'); // untouched slot falls back to template
  });
  it('preserves null/sentinel overrides (off / reuse)', () => {
    const cfg: ProjectModelConfig = { templateId: 'default', overrides: { voiceInput: null, imageGen: 'agent' } };
    const r = resolveAssignment(tpl, cfg);
    expect(r.voiceInput).toBeNull();
    expect(r.imageGen).toBe('agent');
  });
});
