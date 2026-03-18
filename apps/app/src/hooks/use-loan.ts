import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClientStatus } from '@workspace/constants';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

// --- Query keys ---

const LOANS_QUERY_KEY = 'loans';
const LOAN_QUERY_KEY = 'loan';

// --- Types ---

export type LoansListResponse = InferResponseType<typeof apiClient.loans.$get, 200>;
type LoanListItemBase = LoansListResponse['data']['loans'][number];

export type LoanDetailResponse = InferResponseType<typeof apiClient.loans[':id']['$get'], 200>;
type LoanDetailBase = LoanDetailResponse['data']['loan'];

type LoanClient = {
  address: string | null;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: ClientStatus;
};

type LoanInstallmentsPagination = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type LoanListItem = LoanListItemBase & {
  _count: {
    installments: number;
  };
  client: LoanClient;
};

export type LoanDetail = LoanDetailBase & {
  client: LoanClient;
  installmentsPagination: LoanInstallmentsPagination;
};

type LoansQueryResponse = Omit<LoansListResponse, 'data'> & {
  data: Omit<LoansListResponse['data'], 'loans'> & {
    loans: Array<LoanListItem>;
  };
};

type LoanQueryResponse = Omit<LoanDetailResponse, 'data'> & {
  data: {
    loan: LoanDetail;
  };
};

export type LoanInstallment = LoanDetail['installments'][number];

type CreateLoanBody = InferRequestType<typeof apiClient.loans.$post>['json'];
type UpdateLoanBody = InferRequestType<typeof apiClient.loans[':id']['$put']>['json'];
type UpdateInstallmentBody = InferRequestType<
  typeof apiClient.loans[':loanId']['installments'][':installmentId']['$put']
>['json'];
type AddInstallmentBody = InferRequestType<
  typeof apiClient.loans[':loanId']['installments']['$post']
>['json'];
type MarkInstallmentPaidBody = InferRequestType<
  typeof apiClient.loans[':loanId']['installments'][':installmentId']['mark-paid']['$post']
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
      return res.json() as Promise<LoansQueryResponse>;
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
      return res.json() as Promise<LoanQueryResponse>;
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

export function useDeleteLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loanId: string) => {
      const res = await apiClient.loans[':id'].$delete({
        param: { id: loanId },
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to delete loan.');
      return data;
    },
    onSuccess: (_data, loanId) => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
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

export function useAddInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      body,
    }: {
      loanId: string;
      body: AddInstallmentBody;
    }) => {
      const res = await apiClient.loans[':loanId'].installments.$post({
        param: { loanId },
        json: body,
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to add installment.');
      return data;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
    },
  });
}

export function useMarkInstallmentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      installmentId,
      body,
    }: {
      loanId: string;
      installmentId: string;
      body: MarkInstallmentPaidBody;
    }) => {
      const res = await apiClient.loans[':loanId'].installments[':installmentId']['mark-paid'].$post({
        param: { loanId, installmentId },
        json: body,
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to mark installment as paid.');
      return data;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
    },
  });
}
