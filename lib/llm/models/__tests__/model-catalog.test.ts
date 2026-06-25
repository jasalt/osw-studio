import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderModel, ProviderId } from '@/lib/llm/providers/types';

// ---------------------------------------------------------------------------
// Strategy: modelsForSlot accepts an optional 4th argument `_loader` which
// defaults to loadProviderModels. In tests we pass a stub function so that
// the filter logic is exercised without any network calls or module mocking.
// ---------------------------------------------------------------------------

import { modelsForSlot } from '@/lib/llm/models/model-catalog';

// Helper to build a ProviderModel quickly
function makeModel(id: string, overrides: Partial<ProviderModel> = {}): ProviderModel {
  return {
    id,
    name: id,
    contextLength: 32000,
    ...overrides,
  };
}

// Stub type for the loader parameter
type Loader = (provider: ProviderId) => Promise<ProviderModel[]>;

// Reusable fixtures
const TEXT_MODEL = makeModel('text-only', { outputModalities: ['text'] });
const IMAGE_MODEL = makeModel('image-gen', { outputModalities: ['image'] });
const MULTI_MODEL = makeModel('multi-out', { outputModalities: ['text', 'image'] });
const UNDECLARED_MODEL = makeModel('undeclared'); // no outputModalities
const AUDIO_IN_MODEL = makeModel('whisper-like', { inputModalities: ['audio', 'text'] });
const TEXT_IN_ONLY = makeModel('text-in-only', { inputModalities: ['text'] });

describe('modelsForSlot', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('agent slot returns text-out models and undeclared-outputModalities models', async () => {
    const loader = vi.fn<Loader>().mockResolvedValue([TEXT_MODEL, IMAGE_MODEL, UNDECLARED_MODEL]);

    const results = await modelsForSlot('agent', ['openrouter'], undefined, loader);
    const ids = results.map((r) => r.model.id);

    expect(ids).toContain('text-only');
    expect(ids).toContain('undeclared'); // undeclared → effective ['text']
    expect(ids).not.toContain('image-gen');
  });

  it('imageGen slot returns only models whose outputModalities include image', async () => {
    const loader = vi.fn<Loader>().mockResolvedValue([TEXT_MODEL, IMAGE_MODEL, MULTI_MODEL, UNDECLARED_MODEL]);

    const results = await modelsForSlot('imageGen', ['openrouter'], undefined, loader);
    const ids = results.map((r) => r.model.id);

    expect(ids).toContain('image-gen');
    expect(ids).toContain('multi-out');
    expect(ids).not.toContain('text-only');
    expect(ids).not.toContain('undeclared'); // undeclared → ['text'], not image
  });

  it('voiceInput slot returns only models whose inputModalities include audio', async () => {
    const loader = vi.fn<Loader>().mockResolvedValue([TEXT_MODEL, AUDIO_IN_MODEL, TEXT_IN_ONLY, UNDECLARED_MODEL]);

    const results = await modelsForSlot('voiceInput', ['openrouter'], undefined, loader);
    const ids = results.map((r) => r.model.id);

    expect(ids).toContain('whisper-like');
    expect(ids).not.toContain('text-only');
    expect(ids).not.toContain('text-in-only');
    expect(ids).not.toContain('undeclared');
  });

  it('opts.all=true returns everything regardless of slot', async () => {
    const loader = vi.fn<Loader>().mockResolvedValue([TEXT_MODEL, IMAGE_MODEL, UNDECLARED_MODEL, AUDIO_IN_MODEL]);

    const results = await modelsForSlot('agent', ['openrouter'], { all: true }, loader);
    const ids = results.map((r) => r.model.id);

    expect(ids).toHaveLength(4);
    expect(ids).toContain('text-only');
    expect(ids).toContain('image-gen');
    expect(ids).toContain('undeclared');
    expect(ids).toContain('whisper-like');
  });

  it('undeclared outputModalities is treated as text (appears for agent, not imageGen)', async () => {
    const undeclared = makeModel('no-modalities'); // no outputModalities at all
    const loader = vi.fn<Loader>().mockResolvedValue([undeclared]);

    const agentResults = await modelsForSlot('agent', ['openai'], undefined, loader);
    const imageResults = await modelsForSlot('imageGen', ['openai'], undefined, loader);

    expect(agentResults.map((r) => r.model.id)).toContain('no-modalities');
    expect(imageResults.map((r) => r.model.id)).not.toContain('no-modalities');
  });

  it('flattens models across multiple providers, attaching provider id', async () => {
    const openaiModel = makeModel('gpt-4o', { outputModalities: ['text'] });
    const anthropicModel = makeModel('claude-3', { outputModalities: ['text'] });

    const loader = vi.fn<Loader>()
      .mockResolvedValueOnce([openaiModel])
      .mockResolvedValueOnce([anthropicModel]);

    const results = await modelsForSlot('agent', ['openai', 'anthropic'], undefined, loader);

    expect(results).toHaveLength(2);
    expect(results.find((r) => r.model.id === 'gpt-4o')?.provider).toBe('openai');
    expect(results.find((r) => r.model.id === 'claude-3')?.provider).toBe('anthropic');
  });

  it('tolerates a provider that throws — skips it and returns others', async () => {
    const openaiModel = makeModel('gpt-4o', { outputModalities: ['text'] });

    const loader = vi.fn<Loader>()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([openaiModel]);

    const results = await modelsForSlot('agent', ['openrouter', 'openai'], undefined, loader);
    expect(results.map((r) => r.model.id)).toContain('gpt-4o');
  });
});
