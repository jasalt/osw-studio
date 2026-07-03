import { describe, it, expect } from 'vitest';
import { templateToForm, formToTemplate, validateTemplateForm, emptyForm } from '../template-form';
import type { InterviewTemplate } from '../types';

describe('template-form', () => {
  it('emptyForm has one blank required item and a default artifact path', () => {
    const f = emptyForm();
    expect(f.items).toHaveLength(1);
    expect(f.items[0].required).toBe(true);
    expect(f.artifactPath).toBe('/.interviews/untitled.md');
  });

  it('formToTemplate maps each item to a single judge assertion with a slug id', () => {
    const f = emptyForm();
    f.title = 'My Interview';
    f.artifactPath = '/.interviews/my-interview.md';
    f.items[0].question = 'What is the goal?';
    f.items[0].criteria = 'The artifact states the goal.';
    const t = formToTemplate(f, 'my-interview');
    expect(t.id).toBe('my-interview');
    expect(t.artifacts).toEqual([{ path: '/.interviews/my-interview.md' }]);
    expect(t.items[0]).toMatchObject({
      id: 'what-is-the-goal',
      elicit: 'What is the goal?',
      required: true,
      completion: [{ type: 'judge', criteria: 'The artifact states the goal.', description: expect.any(String) }],
    });
  });

  it('templateToForm round-trips a built-in', () => {
    const t: InterviewTemplate = {
      id: 'x', title: 'X', description: 'd',
      artifacts: [{ path: '/.interviews/x.md' }],
      items: [{ id: 'a', elicit: 'Q?', completion: [{ type: 'judge', criteria: 'C', description: 'c' }], required: false }],
    };
    const f = templateToForm(t);
    expect(f.title).toBe('X');
    expect(f.artifactPath).toBe('/.interviews/x.md');
    expect(f.items[0]).toMatchObject({ question: 'Q?', criteria: 'C', required: false });
  });

  it('validation rejects empty title, no items, or missing question/criteria', () => {
    const f = emptyForm();
    expect(validateTemplateForm(f)).toContain('title');
    f.title = 'T';
    expect(validateTemplateForm(f)).toMatch(/question|done when|criteria/i);
    f.items[0].question = 'Q'; f.items[0].criteria = 'C';
    expect(validateTemplateForm(f)).toBeNull();
  });

  it('rejects an artifact path outside /.interviews/ or not ending in .md', () => {
    const f = emptyForm();
    f.title = 'T'; f.items[0].question = 'Q'; f.items[0].criteria = 'C';
    f.artifactPath = '/public/x.md';
    expect(validateTemplateForm(f)).toMatch(/\.interviews/i);
    f.artifactPath = '/.interviews/x.txt';
    expect(validateTemplateForm(f)).toMatch(/\.md/i);
    f.artifactPath = '/.interviews/../x.md';
    expect(validateTemplateForm(f)).toMatch(/\.\./);
  });
});
