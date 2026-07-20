import { describe, it, expect } from 'vitest';
import { normalizeModelEntry } from '../llm-client';

describe('normalizeModelEntry', () => {
  it('expands a string entry with defaults', () => {
    expect(normalizeModelEntry('gpt-4o', 32000)).toEqual({
      id: 'gpt-4o',
      name: 'gpt-4o',
      contextLength: 32000,
      supportsFunctions: true,
    });
  });

  it('derives the name from the last path segment of a string id', () => {
    expect(normalizeModelEntry('openai/gpt-4o', 32000).name).toBe('gpt-4o');
  });

  it('keeps an object entry and fills missing defaults', () => {
    expect(normalizeModelEntry({ id: 'x/custom-model', contextLength: 128000 }, 32000)).toMatchObject({
      id: 'x/custom-model',
      name: 'custom-model', // derived from id
      contextLength: 128000, // preserved
      supportsFunctions: true, // default
    });
  });

  it('prefers an explicit name over the id-derived one', () => {
    expect(normalizeModelEntry({ id: 'x/raw', name: 'Pretty Name' }, 32000).name).toBe('Pretty Name');
  });

  it('falls back to the default context length when missing or zero', () => {
    expect(normalizeModelEntry({ id: 'm' }, 32000).contextLength).toBe(32000);
    expect(normalizeModelEntry({ id: 'm', contextLength: 0 }, 32000).contextLength).toBe(32000);
  });

  it('derives supportsVision from inputModalities when not set', () => {
    expect(normalizeModelEntry({ id: 'm', inputModalities: ['text', 'image'] }, 32000).supportsVision).toBe(true);
    expect(normalizeModelEntry({ id: 'm', inputModalities: ['text'] }, 32000).supportsVision).toBe(false);
    expect(normalizeModelEntry({ id: 'm' }, 32000).supportsVision).toBeUndefined();
  });

  it('preserves an explicit supportsVision:false even with an image modality', () => {
    expect(
      normalizeModelEntry({ id: 'm', supportsVision: false, inputModalities: ['image'] }, 32000).supportsVision,
    ).toBe(false);
  });

  it('preserves an explicit supportsFunctions:false', () => {
    expect(normalizeModelEntry({ id: 'm', supportsFunctions: false }, 32000).supportsFunctions).toBe(false);
  });
});
