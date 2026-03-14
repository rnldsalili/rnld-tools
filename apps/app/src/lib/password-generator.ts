import type { PasswordOptions, PasswordStrength } from '@/app/types/password-generator';
import {
  AMBIGUOUS_RE,
  CHAR_LOWERCASE,
  CHAR_NUMBERS,
  CHAR_SYMBOLS,
  CHAR_UPPERCASE,
} from '@/app/constants/password-generator';

export function generatePassword(opts: PasswordOptions): string {
  let charset = '';
  if (opts.uppercase) charset += CHAR_UPPERCASE;
  if (opts.lowercase) charset += CHAR_LOWERCASE;
  if (opts.numbers) charset += CHAR_NUMBERS;
  if (opts.symbols) charset += CHAR_SYMBOLS;
  if (opts.excludeAmbiguous) charset = charset.replace(AMBIGUOUS_RE, '');
  if (!charset) return '';

  const buf = new Uint32Array(opts.length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => charset[n % charset.length]).join('');
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
