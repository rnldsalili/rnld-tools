import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_PRESIGNED_URL_TTL_SECONDS = 900;
const MIN_PRESIGNED_URL_TTL_SECONDS = 60;
const MAX_PRESIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

type PresignEnv = {
  R2_ACCOUNT_ID?: unknown;
  R2_BUCKET_NAME?: unknown;
  R2_ACCESS_KEY_ID?: unknown;
  R2_SECRET_ACCESS_KEY?: unknown;
  R2_PRESIGNED_URL_TTL_SECONDS?: unknown;
};

type R2PresignConfig = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresInSeconds: number;
};

let cachedClient: S3Client | null = null;
let cachedClientKey = '';

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toValidExpiresIn(value: unknown): number {
  if (typeof value !== 'string') {
    return DEFAULT_PRESIGNED_URL_TTL_SECONDS;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PRESIGNED_URL_TTL_SECONDS;
  }

  return Math.min(
    MAX_PRESIGNED_URL_TTL_SECONDS,
    Math.max(MIN_PRESIGNED_URL_TTL_SECONDS, parsed),
  );
}

function resolveR2PresignConfig(env: CloudflareBindings): R2PresignConfig | null {
  const vars = env as unknown as PresignEnv;
  const accountId = toNonEmptyString(vars.R2_ACCOUNT_ID);
  const bucketName = toNonEmptyString(vars.R2_BUCKET_NAME);
  const accessKeyId = toNonEmptyString(vars.R2_ACCESS_KEY_ID);
  const secretAccessKey = toNonEmptyString(vars.R2_SECRET_ACCESS_KEY);

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    expiresInSeconds: toValidExpiresIn(vars.R2_PRESIGNED_URL_TTL_SECONDS),
  };
}

function getS3Client(config: R2PresignConfig): S3Client {
  const clientKey = [
    config.accountId,
    config.accessKeyId,
    config.secretAccessKey,
  ].join(':');

  if (!cachedClient || cachedClientKey !== clientKey) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedClientKey = clientKey;
  }

  return cachedClient;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function looksLikePresignedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.searchParams.has('X-Amz-Algorithm')
      || parsed.searchParams.has('X-Amz-Credential')
      || parsed.searchParams.has('X-Amz-Signature')
    );
  } catch {
    return false;
  }
}

function extractKeyFromUrlPath(url: URL, bucketName?: string): string | null {
  const parts = url.pathname
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));

  if (parts.length === 0) {
    return null;
  }

  if (bucketName && parts[0] === bucketName && parts.length > 1) {
    return parts.slice(1).join('/');
  }

  return parts.join('/');
}

export function normalizeImageStorageKey(
  value: string | null | undefined,
  options?: { bucketName?: string },
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (!isHttpUrl(trimmed)) {
    return trimmed;
  }

  if (!looksLikePresignedUrl(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return extractKeyFromUrlPath(parsed, options?.bucketName) ?? trimmed;
  } catch {
    return trimmed;
  }
}

export async function getR2PresignedGetUrl(
  env: CloudflareBindings,
  key: string,
  options?: { expiresInSeconds?: number },
): Promise<string> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return key;
  }

  if (isHttpUrl(normalizedKey) && !looksLikePresignedUrl(normalizedKey)) {
    return normalizedKey;
  }

  const config = resolveR2PresignConfig(env);
  if (!config) {
    return normalizedKey;
  }

  const objectKey = normalizeImageStorageKey(normalizedKey, {
    bucketName: config.bucketName,
  });

  if (!objectKey) {
    return normalizedKey;
  }

  const client = getS3Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: options?.expiresInSeconds ?? config.expiresInSeconds,
  });
}

export function getR2BucketName(env: CloudflareBindings): string | undefined {
  const vars = env as unknown as PresignEnv;
  return toNonEmptyString(vars.R2_BUCKET_NAME);
}

