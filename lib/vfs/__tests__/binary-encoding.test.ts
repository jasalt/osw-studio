import { describe, it, expect } from 'vitest';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../binary-encoding';

describe('binary-encoding', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 200, 254, 255]);
    const b64 = arrayBufferToBase64(bytes.buffer);
    const out = new Uint8Array(base64ToArrayBuffer(b64));
    expect(Array.from(out)).toEqual(Array.from(bytes));
  });

  it('produces valid base64 (decodable by atob)', () => {
    const bytes = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    const b64 = arrayBufferToBase64(bytes.buffer);
    expect(b64).toBe('iVBORw==');
  });

  it('handles an empty buffer', () => {
    expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe('');
    expect(base64ToArrayBuffer('').byteLength).toBe(0);
  });

  it('round-trips content larger than the chunk size', () => {
    const size = 0x8000 * 2 + 123; // spans multiple 32KB chunks
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) bytes[i] = i % 256;
    const out = new Uint8Array(base64ToArrayBuffer(arrayBufferToBase64(bytes.buffer)));
    expect(out.length).toBe(size);
    expect(Array.from(out)).toEqual(Array.from(bytes));
  });
});
