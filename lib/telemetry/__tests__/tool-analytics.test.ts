import { describe, it, expect } from 'vitest';
import { extractToolAnalytics, extractSkillRead, bucketInterviewTemplateId } from '../tool-analytics';

describe('extractSkillRead', () => {
  const j = (command: string) => JSON.stringify({ command });

  it('maps a built-in skill cat to its id', () => {
    expect(extractSkillRead(j('cat /.skills/frontend-design-luxury.md')))
      .toEqual({ skill: 'frontend-design-luxury' });
  });

  it('buckets non-built-in skill reads to custom', () => {
    expect(extractSkillRead(j('cat /.skills/my-own-thing.md'))).toEqual({ skill: 'custom' });
  });

  it('returns null for non-skill reads and non-cat commands', () => {
    expect(extractSkillRead(j('cat /index.html'))).toBeNull();
    expect(extractSkillRead(j('ls /.skills'))).toBeNull();
    expect(extractSkillRead('not json')).toBeNull();
  });

  it('never includes a path in its output', () => {
    const out = extractSkillRead(j('cat /.skills/secret-project-name.md'));
    expect(JSON.stringify(out)).not.toContain('secret-project-name');
  });
});

describe('extractToolAnalytics', () => {
  it('still buckets bash commands and never emits paths', () => {
    const out = extractToolAnalytics('bash', JSON.stringify({ command: 'cat /some/file.txt' }), true);
    expect(out.command).toBe('cat');
    expect(JSON.stringify(out)).not.toContain('/some/file.txt');
  });
});

describe('bucketInterviewTemplateId', () => {
  it('passes a built-in template id through unchanged', () => {
    // 'understand-company' is one of the shipped built-in interview templates.
    expect(bucketInterviewTemplateId('understand-company')).toBe('understand-company');
  });

  it('buckets a user-authored template id to custom so it never leaks', () => {
    expect(bucketInterviewTemplateId('my-secret-client-interview')).toBe('custom');
    expect(bucketInterviewTemplateId('my-secret-client-interview')).not.toContain('secret');
  });
});
