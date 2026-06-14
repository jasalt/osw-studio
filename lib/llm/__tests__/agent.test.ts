import { describe, it, expect } from 'vitest';
import { agentRegistry } from '../agent';

describe('agentRegistry', () => {
  it('registers the interview agent write-scoped to /.interviews/', () => {
    const interview = agentRegistry.get('interview');
    expect(interview).toBeDefined();
    expect(interview!.writeScope).toBe('/.interviews/');
    // Not fully read-only — it must be able to write its artifacts (within scope)
    expect(interview!.isReadOnly).toBe(false);
    expect(interview!.hasTool('bash')).toBe(true);
  });

  it('leaves the orchestrator agent unscoped (full write access)', () => {
    const orch = agentRegistry.get('orchestrator');
    expect(orch!.writeScope).toBeUndefined();
    expect(orch!.isReadOnly).toBe(false);
  });

  it('keeps read-only agents read-only and unscoped', () => {
    expect(agentRegistry.get('explore')!.isReadOnly).toBe(true);
    expect(agentRegistry.get('explore')!.writeScope).toBeUndefined();
    expect(agentRegistry.get('plan')!.isReadOnly).toBe(true);
  });
});
