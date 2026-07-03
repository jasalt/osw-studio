import type { InterviewTemplate } from './types';
import { getInterviewTemplate } from './templates';

/**
 * Renders a template into the agenda the interview agent works from. Completion
 * assertions belong to the harness, not the agent, so they are not rendered here.
 */
export function renderInterviewAgenda(template: InterviewTemplate): string {
  const lines: string[] = [];
  lines.push(`Interview: ${template.title}`);
  lines.push(template.description);
  lines.push('');

  const artifacts = template.artifacts.map(a => a.path).join(', ');
  lines.push(`Record your findings into: ${artifacts}`);
  lines.push('');

  lines.push('Agenda — cover each item, asking one question at a time:');
  template.items.forEach((item, i) => {
    const optional = item.required === false ? ' (optional)' : '';
    lines.push(`${i + 1}. ${item.elicit}${optional}`);
  });
  lines.push('');

  lines.push(
    'Work through the agenda conversationally, verifying answers against the project where relevant, recording findings into the artifact as you go. Run `status --complete` once every required item is covered.'
  );
  return lines.join('\n');
}

/**
 * Appends the rendered agenda for the given template to a system prompt.
 * Prefers an already-resolved template (custom templates are not in the built-in
 * registry, so the id lookup only covers built-ins). Returns the prompt unchanged
 * when nothing resolves, so callers can pass it through unconditionally.
 */
export function withInterviewAgenda(
  systemPrompt: string,
  templateId: string | undefined,
  template?: InterviewTemplate
): string {
  const resolved = template ?? (templateId ? getInterviewTemplate(templateId) : undefined);
  if (!resolved) return systemPrompt;
  return `${systemPrompt}\n\n${renderInterviewAgenda(resolved)}`;
}
