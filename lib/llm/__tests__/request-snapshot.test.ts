import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestSnapshotStore } from '../request-snapshot';
import type { Message } from '../core/types';

describe('requestSnapshotStore', () => {
  beforeEach(() => {
    requestSnapshotStore.setEnabled(false);
    requestSnapshotStore.clear();
  });

  it('does not capture when disabled', () => {
    requestSnapshotStore.capture({
      messages: [{ role: 'user', content: 'hi' }],
      provider: 'openrouter',
      model: 'qwen/qwen3.6-35b-a3b',
    });
    expect(requestSnapshotStore.getSnapshot()).toBeNull();
  });

  it('captures the latest request when enabled', () => {
    requestSnapshotStore.setEnabled(true);
    requestSnapshotStore.capture({ messages: [{ role: 'user', content: 'first' }], provider: 'p', model: 'm' });
    requestSnapshotStore.capture({ messages: [{ role: 'user', content: 'second' }], provider: 'p', model: 'm' });

    const snap = requestSnapshotStore.getSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.messages).toEqual([{ role: 'user', content: 'second' }]);
    expect(snap!.timestamp).toBeGreaterThan(0);
  });

  it('notifies subscribers on capture and returns a stable snapshot reference', () => {
    requestSnapshotStore.setEnabled(true);
    const listener = vi.fn();
    const unsubscribe = requestSnapshotStore.subscribe(listener);

    requestSnapshotStore.capture({ messages: [], provider: 'p', model: 'm' });
    expect(listener).toHaveBeenCalledTimes(1);

    // Stable reference between captures — required by useSyncExternalStore
    expect(requestSnapshotStore.getSnapshot()).toBe(requestSnapshotStore.getSnapshot());

    unsubscribe();
    requestSnapshotStore.capture({ messages: [], provider: 'p', model: 'm' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on clear and toggling enabled state', () => {
    requestSnapshotStore.setEnabled(true);
    requestSnapshotStore.capture({ messages: [], provider: 'p', model: 'm' });

    const listener = vi.fn();
    requestSnapshotStore.subscribe(listener);
    requestSnapshotStore.clear();
    expect(requestSnapshotStore.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    requestSnapshotStore.setEnabled(false);
    expect(requestSnapshotStore.isEnabled()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('deep-copies captured messages so later mutation cannot corrupt the snapshot', () => {
    requestSnapshotStore.setEnabled(true);
    const messages: Message[] = [{
      role: 'assistant',
      content: 'original',
      tool_calls: [{ id: 'a', type: 'function', function: { name: 'bash', arguments: '{}' } }],
    }];
    requestSnapshotStore.capture({ messages, provider: 'p', model: 'm' });

    messages[0].content = 'mutated';
    messages[0].tool_calls![0].id = 'mutated';

    const snap = requestSnapshotStore.getSnapshot()!;
    expect(snap.messages[0].content).toBe('original');
    expect(snap.messages[0].tool_calls![0].id).toBe('a');
  });
});
