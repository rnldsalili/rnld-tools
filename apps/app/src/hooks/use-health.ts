import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import apiClient from '../lib/api';

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: async () => {
    const res = await apiClient.health.$get();
    return res.json();
  },
});

export function useHealth() {
  return useSuspenseQuery(healthQueryOptions);
}
