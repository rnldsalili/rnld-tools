import { queryOptions, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';

const AUTHORIZATION_QUERY_KEY = 'authorization';

export type AuthorizationResponse = InferResponseType<typeof apiClient.users.me.$get, 200>;

export function authorizationQueryOptions() {
  return queryOptions({
    queryKey: [AUTHORIZATION_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.users.me.$get();
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load authorization details.');
      }

      return result;
    },
  });
}

export function useAuthorizationQuery() {
  return useQuery(authorizationQueryOptions());
}
