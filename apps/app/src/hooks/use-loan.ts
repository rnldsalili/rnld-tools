import { queryOptions, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

export type LoanDetailResponse = InferResponseType<typeof apiClient.loans[':id']['$get'], 200>;
export type LoanDetail = LoanDetailResponse['data']['loan'];
export type LoanInstallment = LoanDetail['installments'][number];

interface LoanQueryParams {
  loanId: string;
  page: number;
  limit: number;
}

export function loanQueryOptions(params: LoanQueryParams) {
  return queryOptions({
    queryKey: ['loan', params.loanId, { page: params.page, limit: params.limit }],
    queryFn: async () => {
      const res = await apiClient.loans[':id'].$get({
        param: { id: params.loanId },
        query: { page: String(params.page), limit: String(params.limit) },
      });
      return res.json() as Promise<LoanDetailResponse>;
    },
    enabled: !!params.loanId,
  });
}

export function useLoan(params: LoanQueryParams) {
  return useQuery(loanQueryOptions(params));
}
