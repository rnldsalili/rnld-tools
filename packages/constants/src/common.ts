export const INVALID_DATE_FORMAT = 'Invalid date format';

export enum Currency {
  PHP = 'PHP',
  USD = 'USD',
}

export const CURRENCIES = [Currency.PHP, Currency.USD] as const;
