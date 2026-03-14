import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

// --- Query keys ---

const LOANS_QUERY_KEY = 'loans';
const LOAN_QUERY_KEY = 'loan';

// --- Types ---

export type LoansListResponse = InferResponseType<typeof apiClient.loans.$get, 200>;
export type LoanListItem = LoansListResponse['data']['loans'][number];

export type LoanDetailResponse = InferResponseType<typeof apiClient.loans[':id']['$get'], 200>;
export type LoanDetail = LoanDetailResponse['data']['loan'];
export type LoanInstallment = LoanDetail['installments'][number];

type CreateLoanBody = InferRequestType<typeof apiClient.loans.$post>['json'];
type UpdateLoanBody = InferRequestType<typeof apiClient.loans[':id']['$put']>['json'];
type UpdateInstallmentBody = InferRequestType<
  typeof apiClient.loans[':loanId']['installments'][':installmentId']['$put']
>['json'];

// --- Query params ---

interface LoansQueryParams {
  search: string;
  page: number;
  limit: number;
}

interface LoanQueryParams {
  loanId: string;
  page: number;
  limit: number;
}

// --- Query options ---

export function loansQueryOptions(params: LoansQueryParams) {
  return queryOptions({
    queryKey: [LOANS_QUERY_KEY, params],
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

export function loanQueryOptions(params: LoanQueryParams) {
  return queryOptions({
    queryKey: [LOAN_QUERY_KEY, params.loanId, { page: params.page, limit: params.limit }],
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

// --- Hooks ---

export function useLoans(params: LoansQueryParams) {
  return useQuery(loansQueryOptions(params));
}

export function useLoan(params: LoanQueryParams) {
  return useQuery(loanQueryOptions(params));
}

export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body }: { body: CreateLoanBody }) => {
      const res = await apiClient.loans.$post({ json: body });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to create loan.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      body,
    }: {
      loanId: string;
      body: UpdateLoanBody;
    }) => {
      const res = await apiClient.loans[':id'].$put({
        param: { id: loanId },
        json: body,
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to update loan.');
      return data;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      installmentId,
      body,
    }: {
      loanId: string;
      installmentId: string;
      body: UpdateInstallmentBody;
    }) => {
      const res = await apiClient.loans[':loanId'].installments[':installmentId'].$put({
        param: { loanId, installmentId },
        json: body,
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to update installment.');
      return data;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
    },
  });
}
