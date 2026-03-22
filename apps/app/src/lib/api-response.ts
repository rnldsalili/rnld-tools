import { getDetailedErrorMessage } from '@workspace/api-client';
import type { ClientResponse } from '@workspace/api-client';
import { parseResponse } from '@/app/lib/api';

export async function parseOkResponseOrThrow<TResponse extends ClientResponse<any, any, any>>(
  response: TResponse | Promise<TResponse>,
  fallbackMessage: string,
) {
  try {
    return await parseResponse(response);
  } catch (error) {
    throw new Error(getDetailedErrorMessage(error) || fallbackMessage);
  }
}
