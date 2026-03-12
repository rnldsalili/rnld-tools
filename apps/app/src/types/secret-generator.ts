export type SecretEncoding = 'base64' | 'base64url' | 'hex';

export interface SecretOptions {
  bytes: number;
  encoding: SecretEncoding;
}
