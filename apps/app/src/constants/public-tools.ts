import {
  FingerprintIcon,
  HandCoinsIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PublicToolHref =
  | '/password-generator'
  | '/uuid-generator'
  | '/secret-generator'
  | '/loan-calculator';

export interface PublicToolDefinition {
  title: string;
  description: string;
  href: PublicToolHref;
  icon: LucideIcon;
  benefit: string;
}

export const PUBLIC_TOOL_ICON_CLASS_NAME =
  'border-primary/15 bg-primary/10 text-primary shadow-sm shadow-primary/10';

export const PUBLIC_TOOLS: Array<PublicToolDefinition> = [
  {
    title: 'Password Generator',
    description:
      'Create policy-ready passwords with fast controls for length, symbols, and complexity.',
    href: '/password-generator',
    icon: KeyRoundIcon,
    benefit: 'For credentials, account setup, and secure resets',
  },
  {
    title: 'UUID Generator',
    description:
      'Generate single or batched UUID v4 values for identifiers, imports, and app workflows.',
    href: '/uuid-generator',
    icon: FingerprintIcon,
    benefit: 'For database records, jobs, and integration payloads',
  },
  {
    title: 'Secret Generator',
    description:
      'Produce cryptographically secure secrets in base64, base64url, or hex without extra tooling.',
    href: '/secret-generator',
    icon: ShieldCheckIcon,
    benefit: 'For API credentials, signing keys, and shared config values',
  },
  {
    title: 'Loan Calculator',
    description:
      'Model repayment amounts, fees, and expected release figures in a clean working screen.',
    href: '/loan-calculator',
    icon: HandCoinsIcon,
    benefit: 'For fast borrower estimates and internal review',
  },
];

export const PUBLIC_TOOLS_BY_HREF: Record<PublicToolHref, PublicToolDefinition> = {
  '/password-generator': PUBLIC_TOOLS[0],
  '/uuid-generator': PUBLIC_TOOLS[1],
  '/secret-generator': PUBLIC_TOOLS[2],
  '/loan-calculator': PUBLIC_TOOLS[3],
};
