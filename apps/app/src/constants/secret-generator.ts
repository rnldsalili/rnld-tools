import type { SecretEncoding, SecretOptions } from '@/app/types/secret-generator';

export const SECRET_BYTES_MIN = 8;
export const SECRET_BYTES_MAX = 128;
export const SECRET_BYTES_DEFAULT = 32;

export const DEFAULT_SECRET_OPTIONS: SecretOptions = {
  bytes: SECRET_BYTES_DEFAULT,
  encoding: 'base64',
};

export const ENCODING_LABELS: Record<SecretEncoding, string> = {
  base64: 'Base64',
  base64url: 'Base64 URL',
  hex: 'Hex',
};
