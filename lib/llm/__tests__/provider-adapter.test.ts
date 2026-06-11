import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OswsProviderAdapter, ProviderAdapterConfig } from '../provider-adapter';
import { requestSnapshotStore } from '../request-snapshot';
import type { Message } from '../core/types';

vi.mock('@/lib/api/backend-status', () => ({
  apiFetch: vi.fn(async () => makeSSEResponse([
    `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello.' }, index: 0, finish_reason: 'stop' }] })}\n\n`,
    'data: [DONE]\n\n',
  ])),
}));

function makeSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function makeAdapter(): OswsProviderAdapter {
  const config: ProviderAdapterConfig = {
    getProviderConfig: () => ({ provider: 'openai', apiKey: 'k', model: 'gpt-test' }),
    getApiUrl: () => 'http://localhost/api/generate',
    getReasoningEnabled: () => false,
    getDebugStreamEnabled: () => false,
    getModelPricing: () => null,
    getCachedModels: () => null,
    progress: { onEvent: vi.fn() },
  };
  return new OswsProviderAdapter(config);
}

const messages: Message[] = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'hi' },
];

describe('OswsProviderAdapter request snapshot capture', () => {
  beforeEach(() => {
    requestSnapshotStore.setEnabled(false);
    requestSnapshotStore.clear();
  });

  it('captures the outgoing message history when capture is enabled', async () => {
    requestSnapshotStore.setEnabled(true);
    await makeAdapter().call({ messages });

    const snap = requestSnapshotStore.getSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.messages).toEqual(messages);
    expect(snap!.provider).toBe('openai');
    expect(snap!.model).toBe('gpt-test');
  });

  it('captures nothing when disabled', async () => {
    await makeAdapter().call({ messages });
    expect(requestSnapshotStore.getSnapshot()).toBeNull();
  });

  it('does not capture silent (compaction) calls', async () => {
    requestSnapshotStore.setEnabled(true);
    await makeAdapter().call({ messages, silent: true });
    expect(requestSnapshotStore.getSnapshot()).toBeNull();
  });
});
