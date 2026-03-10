import type { UuidOptions } from '@/app/types/uuid-generator';

export const UUID_COUNT_MIN = 1;
export const UUID_COUNT_MAX = 20;
export const UUID_COUNT_DEFAULT = 5;

export const DEFAULT_UUID_OPTIONS: UuidOptions = {
  count: UUID_COUNT_DEFAULT,
};
