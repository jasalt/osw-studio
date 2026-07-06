import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestStore, setupOrchestratorMocks } from './test-helpers';
import { playTaskCompleteSoundSubtle } from '@/lib/utils/task-complete-sound';
setupOrchestratorMocks();

describe('permission approval store wiring', () => {
  let store: ReturnType<typeof createTestStore>;
  beforeEach(() => { store = createTestStore(); vi.clearAllMocks(); });

  it('onApprovalNeeded sets pendingApproval, plays the request sound, and resolveApproval resolves it', async () => {
    const req = { command: 'search foo', gateKey: 'search', capabilityLabel: 'Web access' };
    const promise = store.getState()._provideApprovalCallback('proj-1')(req);
    expect(store.getState().pendingApproval?.req.gateKey).toBe('search');
    expect(store.getState().pendingApproval?.projectId).toBe('proj-1');
    expect(playTaskCompleteSoundSubtle).toHaveBeenCalledOnce();
    store.getState().resolveApproval('once');
    await expect(promise).resolves.toBe('once');
    expect(store.getState().pendingApproval).toBeNull();
  });

  it('resolveApproval is a no-op when nothing is pending', () => {
    expect(() => store.getState().resolveApproval('deny')).not.toThrow();
    expect(store.getState().pendingApproval).toBeNull();
  });

  it('queues concurrent approvals and resolves them FIFO', async () => {
    const cb = store.getState()._provideApprovalCallback('proj-1');
    const p1 = cb({ command: 'search a', gateKey: 'search', capabilityLabel: 'Web access' });
    const p2 = cb({ command: 'rm b', gateKey: 'rm', capabilityLabel: 'File deletion' });
    // First request is shown
    expect(store.getState().pendingApproval?.req.command).toBe('search a');
    store.getState().resolveApproval('once');
    await expect(p1).resolves.toBe('once');
    // Second becomes current
    expect(store.getState().pendingApproval?.req.command).toBe('rm b');
    store.getState().resolveApproval('deny');
    await expect(p2).resolves.toBe('deny');
    expect(store.getState().pendingApproval).toBeNull();
  });

  it('clearPendingApprovals denies all queued requests and hides the card', async () => {
    const cb = store.getState()._provideApprovalCallback('proj-1');
    const p1 = cb({ command: 'search a', gateKey: 'search', capabilityLabel: 'Web access' });
    const p2 = cb({ command: 'curl x', gateKey: 'curl:external', capabilityLabel: 'Web access' });
    store.getState().clearPendingApprovals();
    await expect(p1).resolves.toBe('deny');
    await expect(p2).resolves.toBe('deny');
    expect(store.getState().pendingApproval).toBeNull();
  });
});
