import type { PasswordOptions, StrengthLabel } from '@/app/types/password-generator';

export const CHAR_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const CHAR_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
export const CHAR_NUMBERS = '0123456789';
export const CHAR_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
export const AMBIGUOUS_RE = /[0Ol1Ii]/g;

export const PASSWORD_LENGTH_MIN = 4;
export const PASSWORD_LENGTH_MAX = 128;

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 12,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};

export const STRENGTH_COLORS: Record<StrengthLabel, string> = {
  'Too Weak': 'bg-destructive',
  Weak: 'bg-orange-500',
  Fair: 'bg-yellow-500',
  Strong: 'bg-primary',
  'Very Strong': 'bg-primary',
};

export const STRENGTH_TEXT: Record<StrengthLabel, string> = {
  'Too Weak': 'text-destructive',
  Weak: 'text-orange-500',
  Fair: 'text-yellow-500',
  Strong: 'text-primary',
  'Very Strong': 'text-primary',
};
