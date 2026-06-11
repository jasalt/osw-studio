import { describe, it, expect, vi } from 'vitest';
import { parseStreamingResponse } from '../streaming-parser';

function makeSSEStream(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

function sseChunk(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

describe('streaming-parser reasoning merge', () => {
  it('merges id-less reasoning_details into a single entry', async () => {
    const chunks = [
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ type: 'thinking', text: 'First ' }] }, index: 0 }],
      }),
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ type: 'thinking', text: 'second ' }] }, index: 0 }],
      }),
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ type: 'thinking', text: 'third.' }] }, index: 0 }],
      }),
      sseChunk({ choices: [{ delta: { content: 'Answer.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    const response = makeSSEStream(chunks);
    const result = await parseStreamingResponse(response, { provider: 'openrouter', model: 'test' });

    expect(result.reasoningDetails).toHaveLength(1);
    expect(result.reasoningDetails![0].text).toBe('First second third.');
    expect(result.content).toBe('Answer.');
  });

  it('keeps entries with different ids separate', async () => {
    const chunks = [
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ id: 'r1', type: 'thinking', text: 'Block 1' }] }, index: 0 }],
      }),
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ id: 'r2', type: 'thinking', text: 'Block 2' }] }, index: 0 }],
      }),
      sseChunk({ choices: [{ delta: { content: 'Done.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    const response = makeSSEStream(chunks);
    const result = await parseStreamingResponse(response, { provider: 'openrouter', model: 'test' });

    expect(result.reasoningDetails).toHaveLength(2);
    expect(result.reasoningDetails![0].text).toBe('Block 1');
    expect(result.reasoningDetails![1].text).toBe('Block 2');
  });

  it('updates existing entry by id (cumulative snapshot pattern)', async () => {
    const chunks = [
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ id: 'r1', type: 'thinking', text: 'Hello' }] }, index: 0 }],
      }),
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ id: 'r1', type: 'thinking', text: 'Hello world' }] }, index: 0 }],
      }),
      sseChunk({ choices: [{ delta: { content: 'Done.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    const response = makeSSEStream(chunks);
    const result = await parseStreamingResponse(response, { provider: 'gemini', model: 'test' });

    expect(result.reasoningDetails).toHaveLength(1);
    expect(result.reasoningDetails![0].text).toBe('Hello world');
  });

  it('creates synthetic reasoningDetails entry from reasoning buffer', async () => {
    const chunks = [
      sseChunk({
        choices: [{ delta: { reasoning: 'Thinking about this...' }, index: 0 }],
      }),
      sseChunk({ choices: [{ delta: { content: 'Answer.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    const response = makeSSEStream(chunks);
    const result = await parseStreamingResponse(response, { provider: 'openrouter', model: 'deepseek-reasoner' });

    expect(result.reasoning).toBe('Thinking about this...');
    expect(result.reasoningDetails).toHaveLength(1);
    expect(result.reasoningDetails![0].type).toBe('thinking');
    expect(result.reasoningDetails![0].text).toBe('Thinking about this...');
  });

  it('does not create synthetic entry when reasoningDetails already has text', async () => {
    const chunks = [
      sseChunk({
        choices: [{ delta: { reasoning: 'incremental', reasoning_details: [{ type: 'thinking', text: 'incremental' }] }, index: 0 }],
      }),
      sseChunk({ choices: [{ delta: { content: 'Done.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    const response = makeSSEStream(chunks);
    const result = await parseStreamingResponse(response, { provider: 'openrouter', model: 'test' });

    expect(result.reasoningDetails).toHaveLength(1);
    expect(result.reasoningDetails![0].text).toBe('incremental');
  });

  it('emits reasoning_delta progress events for merged chunks', async () => {
    const progressEvents: { event: string; data: any }[] = [];
    const onProgress = (event: string, data?: any) => progressEvents.push({ event, data });

    const chunks = [
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ type: 'thinking', text: 'A' }] }, index: 0 }],
      }),
      sseChunk({
        choices: [{ delta: { reasoning_details: [{ type: 'thinking', text: 'B' }] }, index: 0 }],
      }),
      sseChunk({ choices: [{ delta: { content: 'X' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    const response = makeSSEStream(chunks);
    await parseStreamingResponse(response, { provider: 'openrouter', model: 'test', onProgress });

    const reasoningDeltas = progressEvents.filter(e => e.event === 'reasoning_delta');
    expect(reasoningDeltas).toHaveLength(2);
    expect(reasoningDeltas[0].data.text).toBe('A');
    expect(reasoningDeltas[1].data.text).toBe('B');
  });
});

describe('streaming-parser reasoning_complete closure', () => {
  function collectProgress() {
    const progressEvents: { event: string; data?: any }[] = [];
    const onProgress = (event: string, data?: any) => progressEvents.push({ event, data });
    return { progressEvents, onProgress };
  }

  it('emits reasoning_complete at stream end for a reasoning-only response (delta.reasoning)', async () => {
    const { progressEvents, onProgress } = collectProgress();
    const chunks = [
      sseChunk({ choices: [{ delta: { reasoning: 'Thinking about it. ' }, index: 0 }] }),
      sseChunk({ choices: [{ delta: { reasoning: 'Still thinking.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    await parseStreamingResponse(makeSSEStream(chunks), { provider: 'openrouter', model: 'test', onProgress });

    const completes = progressEvents.filter(e => e.event === 'reasoning_complete');
    expect(completes).toHaveLength(1);
    expect(completes[0].data.reasoning).toBe('Thinking about it. Still thinking.');
  });

  it('emits reasoning_complete exactly once when delta.reasoning is followed by content', async () => {
    const { progressEvents, onProgress } = collectProgress();
    const chunks = [
      sseChunk({ choices: [{ delta: { reasoning: 'Plan first.' }, index: 0 }] }),
      sseChunk({ choices: [{ delta: { content: 'The answer.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    await parseStreamingResponse(makeSSEStream(chunks), { provider: 'openrouter', model: 'test', onProgress });

    expect(progressEvents.filter(e => e.event === 'reasoning_complete')).toHaveLength(1);
  });

  it('does not duplicate reasoning_complete when the think-block was already closed by tool calls', async () => {
    const { progressEvents, onProgress } = collectProgress();
    const chunks = [
      sseChunk({ choices: [{ delta: { content: '<think>Let me act.' }, index: 0 }] }),
      sseChunk({
        choices: [{
          delta: { tool_calls: [{ index: 0, id: 'tc1', function: { name: 'bash', arguments: '{"command":"ls"}' } }] },
          index: 0,
          finish_reason: 'tool_calls',
        }],
      }),
      'data: [DONE]\n\n',
    ];

    await parseStreamingResponse(makeSSEStream(chunks), { provider: 'openrouter', model: 'test', onProgress });

    expect(progressEvents.filter(e => e.event === 'reasoning_complete')).toHaveLength(1);
  });

  it('does not emit reasoning_complete when there was no reasoning', async () => {
    const { progressEvents, onProgress } = collectProgress();
    const chunks = [
      sseChunk({ choices: [{ delta: { content: 'Plain answer.' }, index: 0, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];

    await parseStreamingResponse(makeSSEStream(chunks), { provider: 'openrouter', model: 'test', onProgress });

    expect(progressEvents.filter(e => e.event === 'reasoning_complete')).toHaveLength(0);
  });
});
