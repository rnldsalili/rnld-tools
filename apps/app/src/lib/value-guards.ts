export type PlainRecord = Record<string, unknown>;

export function isOneOf<const T extends ReadonlyArray<string>>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export function isPlainRecord(value: unknown): value is PlainRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function toPlainRecord(value: unknown): PlainRecord {
  return isPlainRecord(value) ? value : {};
}
