/**
 * Safe extraction of analytics properties from tool call arguments.
 * Only whitelisted, enumerated values are emitted — no file paths, contents, or user text.
 */

import { getBuiltInSkillIds } from '@/lib/vfs/skills/registry';
import { isBuiltInInterviewTemplateId } from '@/lib/interview/templates';

/** Built-in interview template ids may be reported; custom ones are anonymized. */
export function bucketInterviewTemplateId(id: string): string {
  return isBuiltInInterviewTemplateId(id) ? id : 'custom';
}

const BASH_COMMAND_WHITELIST = new Set([
  'cat', 'head', 'tail', 'nl', 'ls', 'tree', 'grep', 'rg', 'find',
  'mkdir', 'mv', 'cp', 'rm', 'rmdir', 'touch', 'sed', 'ss', 'echo', 'wc',
  'sort', 'uniq', 'tr', 'curl', 'sleep', 'sqlite3', 'build', 'status', 'agent', 'delegate',
  'preview', 'python', 'python3', 'lua', 'runtime', 'generate-image'
]);

function extractShellAnalytics(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const rawCmd = (args.command ?? args.cmd) as string | undefined;
  const cmd = typeof rawCmd === 'string' ? rawCmd.trim() : '';
  if (cmd) {
    const firstWord = cmd.split(/\s+/)[0];
    result.command = BASH_COMMAND_WHITELIST.has(firstWord) ? firstWord : 'other';
    result.has_pipe = cmd.includes(' | ');
    result.has_redirect = / >>? /.test(cmd);
  }
  return result;
}

export function extractToolAnalytics(
  toolName: string,
  argsJson: string,
  success: boolean
): Record<string, unknown> {
  const base: Record<string, unknown> = { tool: toolName, success };

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson);
    if (!args || typeof args !== 'object' || Array.isArray(args)) return base;
  } catch {
    return base;
  }

  if (toolName === 'bash' || toolName === 'shell') {
    return { ...base, ...extractShellAnalytics(args) };
  }
  return base;
}

/**
 * Detect a skill-file read from a bash cat command. Returns the built-in
 * skill id, 'custom' for user skills, or null when not a skill read.
 * Never returns the path itself.
 */
export function extractSkillRead(argsJson: string): { skill: string } | null {
  try {
    const args = JSON.parse(argsJson);
    const raw = (args?.command ?? args?.cmd) as string | undefined;
    if (typeof raw !== 'string') return null;
    const cmd = raw.trim();
    if (!cmd.startsWith('cat ')) return null;
    const m = cmd.match(/\/\.skills\/([A-Za-z0-9_-]+)\.md/);
    if (!m) return null;
    const id = m[1];
    return { skill: getBuiltInSkillIds().includes(id) ? id : 'custom' };
  } catch {
    return null;
  }
}
