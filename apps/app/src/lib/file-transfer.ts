import { getDetailedErrorMessage } from '@workspace/api-client';
import { parseResponse } from '@/app/lib/api';

export async function readBlobResponseOrThrow(
  response: Awaited<Parameters<typeof parseResponse>[0]>,
  fallbackMessage: string,
) {
  if (!response.ok) {
    await parseResponse(response);
    throw new Error(fallbackMessage);
  }

  return response.blob();
}

export function downloadBlobFile(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchorElement = document.createElement('a');
  anchorElement.href = objectUrl;
  anchorElement.download = fileName;
  anchorElement.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1_000);
}

export function getFileTransferErrorMessage(error: unknown, fallbackMessage: string) {
  return getDetailedErrorMessage(error) || fallbackMessage;
}
