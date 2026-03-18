import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientStatus } from '@workspace/constants';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { isPlainRecord } from '@/app/lib/value-guards';

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
  createdAt: string;
  createdByUserId: string;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: ClientStatus;
  updatedAt: string;
  updatedByUserId: string;
};

type LoanInstallmentsPagination = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type LoanListItem = Omit<LoanListItemBase, '_count' | 'client'> & {
  _count: {
    installments: number;
  };
  client: LoanClient;
};

export type LoanDetail = Omit<LoanDetailBase, 'client' | 'installmentsPagination'> & {
  client: LoanClient;
  installmentsPagination: LoanInstallmentsPagination;
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

function normalizeLoanListItem(loan: LoanListItemBase): LoanListItem {
  return {
    ...loan,
    _count: getLoanInstallmentCount(loan),
    client: getLoanClient(loan),
  };
}

function normalizeLoanDetail(loan: LoanDetailBase): LoanDetail {
  return {
    ...loan,
    client: getLoanClient(loan),
    installmentsPagination: getLoanInstallmentsPagination(loan),
  };
}

function getLoanInstallmentCount(loan: object) {
  const countValue = Reflect.get(loan, '_count');
  if (!isPlainRecord(countValue) || typeof countValue.installments !== 'number') {
    return { installments: 0 };
  }

  return { installments: countValue.installments };
}

function getLoanClient(loan: object): LoanClient {
  const clientValue = Reflect.get(loan, 'client');
  if (isLoanClient(clientValue)) {
    return clientValue;
  }

  return {
    createdAt: getOptionalString(loan, 'createdAt') ?? '',
    createdByUserId: getOptionalString(loan, 'createdByUserId') ?? '',
    id: getOptionalString(loan, 'clientId') ?? '',
    name: getOptionalString(loan, 'borrower') ?? '',
    phone: getNullableString(loan, 'phone'),
    email: getNullableString(loan, 'email'),
    address: getNullableString(loan, 'address'),
    status: getLoanClientStatus(loan),
    updatedAt: getOptionalString(loan, 'updatedAt') ?? '',
    updatedByUserId: getOptionalString(loan, 'updatedByUserId') ?? '',
  };
}

function getLoanInstallmentsPagination(loan: object): LoanInstallmentsPagination {
  const paginationValue = Reflect.get(loan, 'installmentsPagination');
  if (
    isPlainRecord(paginationValue)
    && typeof paginationValue.limit === 'number'
    && typeof paginationValue.page === 'number'
    && typeof paginationValue.total === 'number'
    && typeof paginationValue.totalPages === 'number'
  ) {
    return {
      limit: paginationValue.limit,
      page: paginationValue.page,
      total: paginationValue.total,
      totalPages: paginationValue.totalPages,
    };
  }

  return {
    limit: 0,
    page: 1,
    total: 0,
    totalPages: 0,
  };
}

function isLoanClient(value: unknown): value is LoanClient {
  return isPlainRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.createdByUserId === 'string'
    && (value.phone === null || typeof value.phone === 'string')
    && (value.email === null || typeof value.email === 'string')
    && (value.address === null || typeof value.address === 'string')
    && typeof value.updatedAt === 'string'
    && typeof value.updatedByUserId === 'string'
    && Object.values(ClientStatus).some((status) => status === value.status);
}

function getOptionalString(source: object, key: string) {
  const value = Reflect.get(source, key);
  return typeof value === 'string' ? value : undefined;
}

function getNullableString(source: object, key: string) {
  const value = Reflect.get(source, key);
  return value === null || typeof value === 'string' ? value : null;
}

function getLoanClientStatus(source: object) {
  const value = Reflect.get(source, 'status');
  return Object.values(ClientStatus).find((status) => status === value) ?? ClientStatus.ENABLED;
}

// --- Query options ---

export function loansQueryOptions(params: LoansQueryParams) {
  return queryOptions({
    queryKey: [LOANS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await apiClient.loans.$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
        },
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load loans.');
      }

      return {
        ...result,
        data: {
          ...result.data,
          loans: result.data.loans.map(normalizeLoanListItem),
        },
      };
    },
  });
}

export function loanQueryOptions(params: LoanQueryParams) {
  return queryOptions({
    queryKey: [LOAN_QUERY_KEY, params.loanId, { page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans[':id'].$get({
        param: { id: params.loanId },
        query: { page: String(params.page), limit: String(params.limit) },
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load loan.');
      }

      return {
        ...result,
        data: {
          loan: normalizeLoanDetail(result.data.loan),
        },
      };
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
      const response = await apiClient.loans.$post({ json: body });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to create loan.');
      }

      return result;
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
      const response = await apiClient.loans[':id'].$put({
        param: { id: loanId },
        json: body,
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to update loan.');
      }

      return result;
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
      const response = await apiClient.loans[':id'].$delete({
        param: { id: loanId },
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to delete loan.');
      }

      return result;
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
      const response = await apiClient.loans[':loanId'].installments[':installmentId'].$put({
        param: { loanId, installmentId },
        json: body,
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to update installment.');
      }

      return result;
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
      const response = await apiClient.loans[':loanId'].installments.$post({
        param: { loanId },
        json: body,
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to add installment.');
      }

      return result;
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
      const response = await apiClient.loans[':loanId'].installments[':installmentId']['mark-paid'].$post({
        param: { loanId, installmentId },
        json: body,
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to mark installment as paid.');
      }

      return result;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
    },
  });
}
