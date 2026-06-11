import { describe, it, expect, vi } from 'vitest';
import { importWithRetry } from '../import-retry';

describe('importWithRetry', () => {
  it('returns the module on first success', async () => {
    const importer = vi.fn(async () => ({ value: 42 }));
    const result = await importWithRetry(importer);
    expect(result.value).toBe(42);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('retries once after a chunk load failure', async () => {
    const importer = vi.fn<() => Promise<{ value: string }>>()
      .mockRejectedValueOnce(new Error('Loading chunk 42 failed'))
      .mockResolvedValueOnce({ value: 'fresh' });
    const result = await importWithRetry(importer);
    expect(result.value).toBe('fresh');
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('throws when both attempts fail', async () => {
    const importer = vi.fn().mockRejectedValue(new Error('Loading chunk 42 failed'));
    await expect(importWithRetry(importer)).rejects.toThrow('Loading chunk 42 failed');
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
