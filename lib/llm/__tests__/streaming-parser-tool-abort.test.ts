import { describe, it, expect } from 'vitest';
import { parseStreamingResponse } from '../streaming-parser';

function makeSSEStream(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream);
}

const sse = (data: object) => `data: ${JSON.stringify(data)}\n\n`;
const BASH_ONLY = new Set(['bash']);

// A big argument payload that should NOT get accumulated once we abort.
const HUGE_ARGS = JSON.stringify({ command: 'cat ' + 'x'.repeat(5000) });

describe('streaming-parser early tool-name abort', () => {
  it('aborts early on a non-bash tool name (OpenAI format) before reading arguments', async () => {
    const chunks = [
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc1', type: 'function', function: { name: 'cat', arguments: '' } }] }, index: 0 }] }),
      // These should never be processed — the stream is cancelled at the name.
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: HUGE_ARGS } }] }, index: 0 }] }),
      sse({ choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }] }),
      'data: [DONE]\n\n',
    ];
    const result = await parseStreamingResponse(makeSSEStream(chunks), {
      provider: 'openrouter', model: 'test', allowedToolNames: BASH_ONLY,
    });
    expect(result.invalidToolName).toBe('cat');
    // The huge arguments were never accumulated.
    const cat = (result.toolCalls ?? []).find(t => t.function?.name === 'cat');
    expect(cat?.function?.arguments ?? '').not.toContain('xxxx');
  });

  it('does not abort a valid bash tool call', async () => {
    const chunks = [
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc1', type: 'function', function: { name: 'bash', arguments: '' } }] }, index: 0 }] }),
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify({ command: 'ls /' }) } }] }, index: 0 }] }),
      sse({ choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }] }),
      'data: [DONE]\n\n',
    ];
    const result = await parseStreamingResponse(makeSSEStream(chunks), {
      provider: 'openrouter', model: 'test', allowedToolNames: BASH_ONLY,
    });
    expect(result.invalidToolName).toBeUndefined();
    expect(result.toolCalls?.[0]?.function?.name).toBe('bash');
    expect(result.toolCalls?.[0]?.function?.arguments).toContain('ls /');
  });

  it('does not abort when no allowedToolNames is provided (backward compatible)', async () => {
    const chunks = [
      sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc1', type: 'function', function: { name: 'cat', arguments: JSON.stringify({ path: '/x' }) } }] }, index: 0 }] }),
      sse({ choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }] }),
      'data: [DONE]\n\n',
    ];
    const result = await parseStreamingResponse(makeSSEStream(chunks), {
      provider: 'openrouter', model: 'test', // no allowedToolNames
    });
    expect(result.invalidToolName).toBeUndefined();
    expect(result.toolCalls?.[0]?.function?.name).toBe('cat');
  });

  it('aborts early on a non-bash tool name (Anthropic format)', async () => {
    const chunks = [
      sse({ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tc1', name: 'cat' } }),
      sse({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: HUGE_ARGS } }),
      sse({ type: 'content_block_stop', index: 0 }),
    ];
    const result = await parseStreamingResponse(makeSSEStream(chunks), {
      provider: 'anthropic', model: 'test', allowedToolNames: BASH_ONLY,
    });
    expect(result.invalidToolName).toBe('cat');
  });
});
