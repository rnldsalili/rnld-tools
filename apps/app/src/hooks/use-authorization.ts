import { queryOptions, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const AUTHORIZATION_QUERY_KEY = 'authorization';

export type AuthorizationResponse = InferResponseType<typeof apiClient.users.me.$get, 200>;

export function authorizationQueryOptions() {
  return queryOptions({
    queryKey: [AUTHORIZATION_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.users.me.$get();
      return parseOkResponseOrThrow(response, 'Failed to load authorization details.');
    },
  });
}

export function useAuthorizationQuery() {
  return useQuery(authorizationQueryOptions());
}
