const PHILIPPINE_LOCAL_MOBILE_NUMBER_PATTERN = /^09\d{9}$/;
const PHILIPPINE_E164_MOBILE_NUMBER_PATTERN = /^\+639\d{9}$/;

export function normalizePhilippineMobileNumber(phoneNumber: string, fieldLabel: string) {
  const trimmedPhoneNumber = phoneNumber.trim();
  const compactPhoneNumber = trimmedPhoneNumber.startsWith('+')
    ? `+${trimmedPhoneNumber.slice(1).replace(/\D/g, '')}`
    : trimmedPhoneNumber.replace(/\D/g, '');

  if (PHILIPPINE_E164_MOBILE_NUMBER_PATTERN.test(compactPhoneNumber)) {
    return compactPhoneNumber;
  }

  if (PHILIPPINE_LOCAL_MOBILE_NUMBER_PATTERN.test(compactPhoneNumber)) {
    return `+63${compactPhoneNumber.slice(1)}`;
  }

  throw new Error(`${fieldLabel} must start with +639 or 09 followed by 9 digits.`);
}
