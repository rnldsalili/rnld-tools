import type { PasswordOptions, PasswordStrength } from '@/app/types/password-generator';
import {
  AMBIGUOUS_RE,
  CHAR_LOWERCASE,
  CHAR_NUMBERS,
  CHAR_SYMBOLS,
  CHAR_UPPERCASE,
} from '@/app/constants/password-generator';

export function generatePassword(opts: PasswordOptions): string {
  const enabledCharsets = [
    opts.uppercase ? filterCharset(CHAR_UPPERCASE, opts.excludeAmbiguous) : '',
    opts.lowercase ? filterCharset(CHAR_LOWERCASE, opts.excludeAmbiguous) : '',
    opts.numbers ? filterCharset(CHAR_NUMBERS, opts.excludeAmbiguous) : '',
    opts.symbols ? filterCharset(CHAR_SYMBOLS, opts.excludeAmbiguous) : '',
  ].filter((charset) => charset.length > 0);

  if (enabledCharsets.length === 0 || opts.length < enabledCharsets.length) return '';

  const combinedCharset = enabledCharsets.join('');
  const passwordCharacters = enabledCharsets.map((charset) => pickRandomCharacter(charset));

  while (passwordCharacters.length < opts.length) {
    passwordCharacters.push(pickRandomCharacter(combinedCharset));
  }

  shuffleCharacters(passwordCharacters);

  return passwordCharacters.join('');
}

export function calcStrength(opts: PasswordOptions): PasswordStrength {
  const charTypes = [opts.uppercase, opts.lowercase, opts.numbers, opts.symbols].filter(Boolean).length;

  if (charTypes === 0) return { label: 'Too Weak', score: 0 };

  let score = 0;
  if (opts.length >= 8) score++;
  if (opts.length >= 12) score++;
  if (opts.length >= 16) score++;
  if (opts.length >= 20) score++;
  if (charTypes >= 2) score++;
  if (charTypes >= 3) score++;
  if (charTypes >= 4) score++;

  if (score <= 1) return { label: 'Too Weak', score: 1 };
  if (score <= 3) return { label: 'Weak', score: 2 };
  if (score <= 4) return { label: 'Fair', score: 3 };
  if (score <= 5) return { label: 'Strong', score: 4 };
  return { label: 'Very Strong', score: 5 };
}

function filterCharset(charset: string, excludeAmbiguous: boolean): string {
  return excludeAmbiguous ? charset.replace(AMBIGUOUS_RE, '') : charset;
}

function pickRandomCharacter(charset: string): string {
  return charset[getRandomInt(charset.length)] ?? '';
}

function shuffleCharacters(characters: string[]): void {
  for (let currentIndex = characters.length - 1; currentIndex > 0; currentIndex--) {
    const randomIndex = getRandomInt(currentIndex + 1);
    [characters[currentIndex], characters[randomIndex]] = [characters[randomIndex], characters[currentIndex]];
  }
}

function getRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;

  const randomBuffer = new Uint32Array(1);
  const maxUint32 = 0x100000000;
  const unbiasedLimit = maxUint32 - (maxUint32 % maxExclusive);

  while (true) {
    crypto.getRandomValues(randomBuffer);
    const randomValue = randomBuffer[0] ?? 0;
    if (randomValue < unbiasedLimit) {
      return randomValue % maxExclusive;
    }
  }
}
