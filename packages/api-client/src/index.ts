import { hc } from 'hono/client';

import type { AppType } from '@workspace/api/routes';

export { parseResponse, DetailedError } from 'hono/client';
export type { InferRequestType, InferResponseType } from 'hono/client';

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
