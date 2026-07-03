import type { InterviewTemplate, InterviewItem, InterviewHandoff } from './types';

export interface ItemForm { question: string; criteria: string; required: boolean; }
export interface TemplateForm {
  title: string;
  description: string;
  artifactPath: string;
  items: ItemForm[];
  handoff: { label: string; prompt: string; mode: 'code' | 'chat' } | null;
}

/** Slug used for template ids and item ids. Mirrors SkillsService.slugify. */
export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function emptyForm(): TemplateForm {
  return {
    title: '',
    description: '',
    artifactPath: '/.interviews/untitled.md',
    items: [{ question: '', criteria: '', required: true }],
    handoff: null,
  };
}

export function templateToForm(t: InterviewTemplate): TemplateForm {
  return {
    title: t.title,
    description: t.description,
    artifactPath: t.artifacts[0]?.path ?? '/.interviews/untitled.md',
    items: t.items.map(i => ({
      question: i.elicit,
      criteria: i.completion.find(a => a.type === 'judge')?.criteria ?? '',
      required: i.required !== false,
    })),
    handoff: t.handoff ? { label: t.handoff.label, prompt: t.handoff.prompt, mode: t.handoff.mode } : null,
  };
}

export function formToTemplate(f: TemplateForm, id: string): InterviewTemplate {
  const items: InterviewItem[] = f.items.map(i => ({
    id: slugify(i.question) || 'item',
    elicit: i.question.trim(),
    required: i.required,
    completion: [{ type: 'judge' as const, criteria: i.criteria.trim(), description: i.question.trim() }],
  }));
  const handoff: InterviewHandoff | undefined = f.handoff && f.handoff.label.trim()
    ? { label: f.handoff.label.trim(), prompt: f.handoff.prompt.trim(), mode: f.handoff.mode }
    : undefined;
  return {
    id,
    title: f.title.trim(),
    description: f.description.trim(),
    artifacts: [{ path: f.artifactPath.trim() }],
    items,
    ...(handoff ? { handoff } : {}),
  };
}

/** Returns an error message, or null if valid. */
export function validateTemplateForm(f: TemplateForm): string | null {
  if (!f.title.trim()) return 'Give the template a title.';
  if (!f.artifactPath.startsWith('/.interviews/')) return 'The artifact path must be under /.interviews/.';
  if (!f.artifactPath.endsWith('.md')) return 'The artifact path must end in .md.';
  if (f.artifactPath.includes('..')) return 'The artifact path cannot contain "..".';
  if (f.items.length === 0) return 'Add at least one item.';
  for (const i of f.items) {
    if (!i.question.trim()) return 'Every item needs a question.';
    if (!i.criteria.trim()) return 'Every item needs a "done when" criteria.';
  }
  return null;
}
