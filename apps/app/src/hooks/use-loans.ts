import { queryOptions, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

export type LoansListResponse = InferResponseType<typeof apiClient.loans.$get, 200>;
export type LoanListItem = LoansListResponse['data']['loans'][number];

interface LoansQueryParams {
  search: string;
  page: number;
  limit: number;
}

export function loansQueryOptions(params: LoansQueryParams) {
  return queryOptions({
    queryKey: ['loans', params],
    queryFn: async () => {
      const res = await apiClient.loans.$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
        },
      });
      return res.json() as Promise<LoansListResponse>;
    },
  });
}

export function useLoans(params: LoansQueryParams) {
  return useQuery(loansQueryOptions(params));
}
