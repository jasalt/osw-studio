/**
 * Base64 helpers for serializing binary file content (images, video, fonts) to
 * and from JSON. VirtualFile binary content is an ArrayBuffer, which
 * JSON.stringify turns into `{}` — so JSON project exports must encode it as a
 * base64 string and decode it back on import.
 */

/** Encode an ArrayBuffer as a base64 string (chunked to avoid call-stack limits). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB per chunk keeps String.fromCharCode within limits
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Decode a base64 string back into an ArrayBuffer. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
