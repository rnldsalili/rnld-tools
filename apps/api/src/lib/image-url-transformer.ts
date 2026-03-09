import { getR2PresignedGetUrl, normalizeImageStorageKey } from '@/api/lib/r2-presigner';

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function transformImageField(
  env: CloudflareBindings,
  value: unknown,
  cache: Map<string, string>,
): Promise<unknown> {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = normalizeImageStorageKey(value)?.trim();
  if (!normalized) {
    return value;
  }

  const cached = cache.get(normalized);
  if (cached) {
    return cached;
  }

  const signedUrl = await getR2PresignedGetUrl(env, normalized);
  cache.set(normalized, signedUrl);
  return signedUrl;
}

async function transformValue(
  env: CloudflareBindings,
  value: unknown,
  cache: Map<string, string>,
): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => transformValue(env, entry, cache)));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const entries = await Promise.all(
    Object.entries(value).map(async ([key, fieldValue]) => {
      if (key === 'image') {
        return [key, await transformImageField(env, fieldValue, cache)] as const;
      }

      return [key, await transformValue(env, fieldValue, cache)] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function replaceImageKeysWithPresignedUrls<T>(
  env: CloudflareBindings,
  value: T,
): Promise<T> {
  const cache = new Map<string, string>();
  return (await transformValue(env, value, cache)) as T;
}

