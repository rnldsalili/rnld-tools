import { z } from 'zod';

export const PHILIPPINE_MOBILE_NUMBER_PATTERN = /^(?:\+639|09)\d{9}$/;
export const PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE = 'Must start with +639 or 09 followed by 9 digits.';

function formatPhoneNumberErrorMessage(fieldLabel?: string) {
  if (!fieldLabel) {
    return PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE;
  }

  return `${fieldLabel} ${PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE.charAt(0).toLowerCase()}${PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE.slice(1)}`;
}

export function isPhilippineMobileNumber(value: string) {
  return PHILIPPINE_MOBILE_NUMBER_PATTERN.test(value.trim());
}

export function normalizePhilippineMobileNumber(value: string, fieldLabel?: string) {
  const trimmedValue = value.trim();

  if (!isPhilippineMobileNumber(trimmedValue)) {
    throw new Error(formatPhoneNumberErrorMessage(fieldLabel));
  }

  return trimmedValue.startsWith('09')
    ? `+63${trimmedValue.slice(1)}`
    : trimmedValue;
}

export function getPhilippineMobileNumberSearchTerms(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || !isPhilippineMobileNumber(trimmedValue)) {
    return trimmedValue ? [trimmedValue] : [];
  }

  const normalizedValue = normalizePhilippineMobileNumber(trimmedValue);
  const localValue = normalizedValue.replace(/^\+63/, '0');

  return [...new Set([trimmedValue, normalizedValue, localValue])];
}

export const philippineMobileNumberSchema = z.string()
  .trim()
  .refine(isPhilippineMobileNumber, {
    error: PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE,
  })
  .transform((value) => normalizePhilippineMobileNumber(value));

export const optionalPhilippineMobileNumberSchema = philippineMobileNumberSchema.optional();

export const nullableOptionalPhilippineMobileNumberSchema = philippineMobileNumberSchema.nullable().optional();
