import { normalizePhilippineMobileNumber as normalizeSharedPhilippineMobileNumber } from '@workspace/constants';

export function normalizePhilippineMobileNumber(phoneNumber: string, fieldLabel: string) {
  return normalizeSharedPhilippineMobileNumber(phoneNumber, fieldLabel);
}
