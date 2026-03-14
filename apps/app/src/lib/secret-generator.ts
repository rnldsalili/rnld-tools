import type { SecretEncoding, SecretOptions } from '@/app/types/secret-generator';

export function generateSecret(opts: SecretOptions): string {
  const bytes = new Uint8Array(opts.bytes);
  crypto.getRandomValues(bytes);

  if (opts.encoding === 'hex') {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Build binary string without spread (avoids stack overflow for large arrays)
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const b64 = btoa(binary);

  if (opts.encoding === 'base64url') {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  return b64;
}

/** Returns the expected character length of the encoded output. */
export function outputLength(bytes: number, encoding: SecretEncoding): number {
  if (encoding === 'hex') return bytes * 2;
  // base64 / base64url
  const b64Len = Math.ceil(bytes / 3) * 4;
  if (encoding === 'base64url') {
    const padding = bytes % 3 === 1 ? 2 : bytes % 3 === 2 ? 1 : 0;
    return b64Len - padding;
  }
  return b64Len;
}
