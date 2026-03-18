import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import apiClient, { parseResponse } from '@/app/lib/api';

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: async () => {
    const response = await apiClient.health.$get();
    const result = await parseResponse(response);

    if (!response.ok) {
      throw new Error('Failed to load health status.');
    }

    return result;
  },
});

export function useHealth() {
  return useSuspenseQuery(healthQueryOptions);
}
