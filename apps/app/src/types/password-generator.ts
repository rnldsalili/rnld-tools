export type StrengthLabel = 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface PasswordStrength {
  label: StrengthLabel;
  /** 1–5 */
  score: number;
}
