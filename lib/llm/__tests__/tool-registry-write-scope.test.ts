import { describe, it, expect, vi } from 'vitest';
import type { ToolCall } from '../types';

const mockVfs = {
  init: vi.fn(),
  createFile: vi.fn().mockResolvedValue({}),
  updateFile: vi.fn().mockResolvedValue({}),
  readFile: vi.fn().mockResolvedValue({ content: '' }),
  listFiles: vi.fn().mockResolvedValue([]),
  getFile: vi.fn().mockResolvedValue(null),
};

vi.mock('@/lib/vfs', () => ({ getActiveVFS: () => mockVfs, vfs: mockVfs }));
vi.mock('@/lib/utils', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

function bash(command: string): ToolCall {
  return { id: 't', type: 'function', function: { name: 'bash', arguments: JSON.stringify({ command }) } };
}

const interviewCtx = { agentType: 'interview', isReadOnly: false, writeScope: '/.interviews/' };

describe('tool-registry write scope (interview agent end-to-end)', () => {
  it('denies a write outside the scope', async () => {
    const { toolRegistry } = await import('../tool-registry');
    const result = await toolRegistry.execute(bash('echo "x" > /index.html'), 'p', interviewCtx);
    expect(result).toContain('/.interviews/');
    expect(result.toLowerCase()).toContain('write');
  });

  it('denies a traversal escape out of the scope', async () => {
    const { toolRegistry } = await import('../tool-registry');
    const result = await toolRegistry.execute(bash('echo "x" > /.interviews/../index.html'), 'p', interviewCtx);
    expect(result).toContain('/.interviews/');
  });

  it('allows a write inside the scope', async () => {
    const { toolRegistry } = await import('../tool-registry');
    const result = await toolRegistry.execute(bash('echo "notes" > /.interviews/findings.md'), 'p', interviewCtx);
    expect(result).not.toContain('may only write within');
  });

  it('allows reads anywhere under the scope', async () => {
    const { toolRegistry } = await import('../tool-registry');
    const result = await toolRegistry.execute(bash('cat /index.html'), 'p', interviewCtx);
    expect(result).not.toContain('may only write within');
  });

  it('does not restrict an unscoped agent', async () => {
    const { toolRegistry } = await import('../tool-registry');
    const result = await toolRegistry.execute(bash('echo "x" > /index.html'), 'p', { agentType: 'orchestrator', isReadOnly: false });
    expect(result).not.toContain('may only write within');
  });
});
