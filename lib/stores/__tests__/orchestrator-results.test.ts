import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestStore, setupOrchestratorMocks } from './test-helpers';
import { toast } from 'sonner';
import { track } from '@/lib/telemetry';

const mockExecute = vi.fn();
const mockStop = vi.fn();
const mockContinue = vi.fn();
const mockImportConversation = vi.fn();

vi.mock('@/lib/llm/multi-agent-orchestrator', () => ({
  MultiAgentOrchestrator: vi.fn().mockImplementation(() => ({
    execute: mockExecute,
    stop: mockStop,
    continue: mockContinue,
    importConversation: mockImportConversation,
  })),
}));

setupOrchestratorMocks();

describe('orchestrator slice — generation results and conversation rebuild', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({
      success: true,
      summary: 'done',
      totalCost: 0,
      toolCount: 0,
      turnCount: 0,
      apiErrorCount: 0,
    });
  });

  it('does not show an error toast or double-track task_fail for a user-stopped run', async () => {
    mockExecute.mockResolvedValue({
      success: false,
      summary: 'Stopped by user',
      exitReason: 'stopped',
      totalCost: 0,
      toolCount: 1,
      turnCount: 1,
      apiErrorCount: 0,
    });

    await store.getState().startGeneration('build something');

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalledWith('Task completed');
    const failCalls = (track as ReturnType<typeof vi.fn>).mock.calls.filter(c => c[0] === 'task_fail');
    expect(failCalls).toHaveLength(0);
  });

  it('still reports genuine failures with toast and telemetry', async () => {
    mockExecute.mockResolvedValue({
      success: false,
      summary: 'Reached maximum iterations (40)',
      exitReason: 'max_iterations',
      totalCost: 0,
      toolCount: 1,
      turnCount: 1,
      apiErrorCount: 0,
    });

    await store.getState().startGeneration('build something');

    expect(toast.error).toHaveBeenCalled();
    const failCalls = (track as ReturnType<typeof vi.fn>).mock.calls.filter(c => c[0] === 'task_fail');
    expect(failCalls).toHaveLength(1);
  });

  it('rebuilds imported conversation from the last conversation_replaced event', async () => {
    const projectId = store.getState().projectId;
    const m1 = { role: 'user', content: 'old pre-compaction message' };
    const replaced = [
      { role: 'system', content: 'SYS' },
      { role: 'assistant', content: 'summary', ui_metadata: { isCompactSummary: true } },
    ];
    const m2 = { role: 'user', content: 'post-compaction message' };

    store.getState().addDebugEvent('conversation_message', { message: m1 }, projectId);
    store.getState().addDebugEvent('conversation_replaced', { messages: replaced }, projectId);
    store.getState().addDebugEvent('conversation_message', { message: m2 }, projectId);

    await store.getState().startGeneration('continue work');

    expect(mockImportConversation).toHaveBeenCalledTimes(1);
    const imported = mockImportConversation.mock.calls[0][0];
    expect(imported).toEqual([...replaced, m2]);
  });
});
