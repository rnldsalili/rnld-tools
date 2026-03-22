import { DetailedError, hc } from 'hono/client';

import type { AppType } from '@workspace/api/routes';

export { parseResponse, DetailedError } from 'hono/client';
export type { ClientResponse, InferRequestType, InferResponseType } from 'hono/client';

// Default export triggers tsc to inline the full route types into the .d.ts,
// removing the transitive dependency on @workspace/api/routes for consumers.
// See: https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
const client = hc<AppType>('');
export default client;

export type Client = typeof client;

export function createClient(baseUrl: string): Client {
  return hc<AppType>(baseUrl, {
    init: {
      credentials: 'include',
    },
  });
}

export function getDetailedErrorMessage(error: unknown) {
  if (error instanceof DetailedError) {
    const errorDetail = error.detail;

    if (
      typeof errorDetail === 'object' &&
      errorDetail !== null &&
      'data' in errorDetail &&
      typeof errorDetail.data === 'object' &&
      errorDetail.data !== null &&
      'meta' in errorDetail.data &&
      typeof errorDetail.data.meta === 'object' &&
      errorDetail.data.meta !== null &&
      'message' in errorDetail.data.meta &&
      typeof errorDetail.data.meta.message === 'string'
    ) {
      return errorDetail.data.meta.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return undefined;
}
