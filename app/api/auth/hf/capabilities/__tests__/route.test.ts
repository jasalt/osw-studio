import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '../route';

const ORIGINAL_SPACE_HOST = process.env.SPACE_HOST;

afterEach(() => {
  if (ORIGINAL_SPACE_HOST === undefined) delete process.env.SPACE_HOST;
  else process.env.SPACE_HOST = ORIGINAL_SPACE_HOST;
});

describe('auth capabilities', () => {
  it('offers Codex login off HF Spaces (local/desktop/self-hosted)', async () => {
    delete process.env.SPACE_HOST;
    const data = await (await GET()).json();
    expect(data.codexAvailable).toBe(true);
  });

  it('hides Codex login on HF Spaces, where the cross-site iframe drops the session cookie', async () => {
    process.env.SPACE_HOST = 'otst-osw-studio.hf.space';
    const data = await (await GET()).json();
    expect(data.codexAvailable).toBe(false);
  });
});
