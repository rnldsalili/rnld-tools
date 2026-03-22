import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: async () => {
    const response = await apiClient.health.$get();
    return parseOkResponseOrThrow(response, 'Failed to load health status.');
  },
});

export function useHealth() {
  return useSuspenseQuery(healthQueryOptions);
}
