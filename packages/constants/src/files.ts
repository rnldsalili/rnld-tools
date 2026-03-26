export const FILE_PREVIEW_IMAGE_MIME_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const FILE_PREVIEW_PDF_MIME_TYPES = [
  'application/pdf',
] as const;

export type FilePreviewType = 'image' | 'pdf';

function normalizeContentType(contentType: string | null | undefined) {
  return contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function isImagePreviewableContentType(contentType: string | null | undefined) {
  return FILE_PREVIEW_IMAGE_MIME_TYPES.includes(
    normalizeContentType(contentType) as (typeof FILE_PREVIEW_IMAGE_MIME_TYPES)[number],
  );
}

export function isPdfPreviewableContentType(contentType: string | null | undefined) {
  return FILE_PREVIEW_PDF_MIME_TYPES.includes(
    normalizeContentType(contentType) as (typeof FILE_PREVIEW_PDF_MIME_TYPES)[number],
  );
}

export function getFilePreviewType(contentType: string | null | undefined): FilePreviewType | null {
  if (isImagePreviewableContentType(contentType)) {
    return 'image';
  }

  if (isPdfPreviewableContentType(contentType)) {
    return 'pdf';
  }

  return null;
}

export function isPreviewableContentType(contentType: string | null | undefined) {
  return getFilePreviewType(contentType) !== null;
}
