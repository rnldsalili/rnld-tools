export const TEMPORARY_PASSWORD_LENGTH = 16;
export const TEMPORARY_PASSWORD_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

/**
 * Generates a random temporary password of the specified length.
 * Uses Web Crypto API for secure random values.
 */
export function generateTemporaryPassword(length = TEMPORARY_PASSWORD_LENGTH): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (randomValue) => (
    TEMPORARY_PASSWORD_CHARACTERS[randomValue % TEMPORARY_PASSWORD_CHARACTERS.length]
  )).join('');
}