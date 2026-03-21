import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDetailedErrorMessage } from '@workspace/api-client';
import { ClientStatus } from '@workspace/constants';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { isPlainRecord } from '@/app/lib/value-guards';

const LOANS_QUERY_KEY = 'loans';
const LOAN_QUERY_KEY = 'loan';
const LOAN_LOGS_QUERY_KEY = 'loan-logs';
const INSTALLMENT_PAYMENTS_QUERY_KEY = 'installment-payments';

export type LoansListResponse = InferResponseType<typeof apiClient.loans.$get, 200>;
type LoanListItemBase = LoansListResponse['data']['loans'][number];

export type LoanDetailResponse = InferResponseType<typeof apiClient.loans[':id']['$get'], 200>;
type LoanDetailBase = LoanDetailResponse['data']['loan'];

type LoanLogsGetRoute = (typeof apiClient.loans)[':loanId']['logs']['$get'];
type InstallmentPaymentsGetRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['payments']['$get'];
type UpdateLoanRoute = (typeof apiClient.loans)[':id']['$put'];
type DeleteLoanRoute = (typeof apiClient.loans)[':id']['$delete'];
type UpdateInstallmentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['$put'];
type AddInstallmentRoute = (typeof apiClient.loans)[':loanId']['installments']['$post'];
type RecordInstallmentPaymentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['payments']['$post'];
type VoidInstallmentPaymentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['payments'][':paymentId']['void']['$post'];

export type LoanActivityLogsResponse = InferResponseType<LoanLogsGetRoute, 200>;
export type LoanActivityLog = LoanActivityLogsResponse['data']['logs'][number];

export type InstallmentPaymentsResponse = InferResponseType<InstallmentPaymentsGetRoute, 200>;
export type InstallmentPayment = InstallmentPaymentsResponse['data']['payments'][number];

type CreateLoanResponse = InferResponseType<typeof apiClient.loans.$post, 201>;
type UpdateLoanResponse = InferResponseType<UpdateLoanRoute, 200>;
type DeleteLoanResponse = InferResponseType<DeleteLoanRoute, 200>;
type UpdateInstallmentResponse = InferResponseType<UpdateInstallmentRoute, 200>;
type AddInstallmentResponse = InferResponseType<AddInstallmentRoute, 201>;
type RecordInstallmentPaymentResponse = InferResponseType<RecordInstallmentPaymentRoute, 201>;
type VoidInstallmentPaymentResponse = InferResponseType<VoidInstallmentPaymentRoute, 200>;

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

type PaginationState = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type LoanInstallment = {
  amount: number;
  createdAt: string;
  createdByUserId: string;
  dueDate: string;
  id: string;
  loanId: string;
  paidAmount: number;
  paidAt: string | null;
  paymentCount: number;
  remainingAmount: number;
  remarks: string | null;
  status: string;
  updatedAt: string;
  updatedByUserId: string;
};

export type LoanListItem = Omit<LoanListItemBase, '_count' | 'client' | 'paidInstallmentsCount'> & {
  _count: {
    installments: number;
  };
  client: LoanClient;
  paidInstallmentsCount: number;
};

export type LoanDetail = Omit<LoanDetailBase, 'client' | 'excessBalance' | 'installments' | 'installmentsPagination'> & {
  client: LoanClient;
  excessBalance: number;
  installments: Array<LoanInstallment>;
  installmentsPagination: PaginationState;
  notificationsEnabled: boolean;
};

type CreateLoanBody = InferRequestType<typeof apiClient.loans.$post>['json'];
type UpdateLoanBody = InferRequestType<UpdateLoanRoute>['json'];
type UpdateInstallmentBody = InferRequestType<UpdateInstallmentRoute>['json'];
type AddInstallmentBody = InferRequestType<AddInstallmentRoute>['json'];
type RecordInstallmentPaymentBody = InferRequestType<RecordInstallmentPaymentRoute>['json'];
type VoidInstallmentPaymentBody = InferRequestType<VoidInstallmentPaymentRoute>['json'];

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

interface LoanLogsQueryParams {
  loanId: string;
  page: number;
  limit: number;
}

interface InstallmentPaymentsQueryParams {
  installmentId: string;
  loanId: string;
  page: number;
  limit: number;
}

function normalizeLoanListItem(loan: LoanListItemBase): LoanListItem {
  return {
    ...loan,
    _count: getLoanInstallmentCount(loan),
    client: getLoanClient(loan),
    paidInstallmentsCount: getOptionalNumber(loan, 'paidInstallmentsCount') ?? 0,
  };
}

function normalizeLoanDetail(loan: LoanDetailBase): LoanDetail {
  return {
    ...loan,
    client: getLoanClient(loan),
    excessBalance: getOptionalNumber(loan, 'excessBalance') ?? 0,
    installments: getLoanInstallments(loan),
    installmentsPagination: getPagination(loan, 'installmentsPagination'),
    notificationsEnabled: getOptionalBoolean(loan, 'notificationsEnabled') ?? true,
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

function getPagination(source: object, key: string): PaginationState {
  const paginationValue = Reflect.get(source, key);
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

function getLoanInstallments(loan: object): Array<LoanInstallment> {
  const installmentsValue = Reflect.get(loan, 'installments');
  if (!Array.isArray(installmentsValue)) {
    return [];
  }

  return installmentsValue
    .filter(isPlainRecord)
    .map((installment): LoanInstallment => ({
      amount: getOptionalNumber(installment, 'amount') ?? 0,
      createdAt: getOptionalString(installment, 'createdAt') ?? '',
      createdByUserId: getOptionalString(installment, 'createdByUserId') ?? '',
      dueDate: getOptionalString(installment, 'dueDate') ?? '',
      id: getOptionalString(installment, 'id') ?? '',
      loanId: getOptionalString(installment, 'loanId') ?? '',
      paidAmount: getOptionalNumber(installment, 'paidAmount') ?? 0,
      paidAt: getNullableString(installment, 'paidAt'),
      paymentCount: getOptionalNumber(installment, 'paymentCount') ?? 0,
      remainingAmount: getOptionalNumber(installment, 'remainingAmount') ?? 0,
      remarks: getNullableString(installment, 'remarks'),
      status: getOptionalString(installment, 'status') ?? '',
      updatedAt: getOptionalString(installment, 'updatedAt') ?? '',
      updatedByUserId: getOptionalString(installment, 'updatedByUserId') ?? '',
    }));
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

function getOptionalNumber(source: object, key: string) {
  const value = Reflect.get(source, key);
  return typeof value === 'number' ? value : undefined;
}

function getOptionalBoolean(source: object, key: string) {
  const value = Reflect.get(source, key);
  return typeof value === 'boolean' ? value : undefined;
}

function getLoanClientStatus(source: object) {
  const value = Reflect.get(source, 'status');
  return Object.values(ClientStatus).find((status) => status === value) ?? ClientStatus.ENABLED;
}

async function parseOkResponseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  try {
    const parsedResponse = await parseResponse(response as never) as unknown;
    const result = parsedResponse as T;
    const metaMessage = isPlainRecord(parsedResponse)
      && isPlainRecord(parsedResponse.meta)
      && typeof parsedResponse.meta.message === 'string'
      ? parsedResponse.meta.message
      : undefined;

    if (!response.ok) {
      throw new Error(metaMessage || fallbackMessage);
    }

    return result;
  } catch (error) {
    throw new Error(getDetailedErrorMessage(error) || fallbackMessage);
  }
}

function invalidateLoanQueries(queryClient: ReturnType<typeof useQueryClient>, params: {
  installmentId?: string;
  loanId: string;
}) {
  queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [LOAN_QUERY_KEY, params.loanId] });
  queryClient.invalidateQueries({ queryKey: [LOAN_LOGS_QUERY_KEY, params.loanId] });

  if (params.installmentId) {
    queryClient.invalidateQueries({
      queryKey: [INSTALLMENT_PAYMENTS_QUERY_KEY, params.loanId, params.installmentId],
    });
  }
}

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
      const result = await parseOkResponseOrThrow<LoansListResponse>(response, 'Failed to load loans.');

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
      const result = await parseOkResponseOrThrow<LoanDetailResponse>(response, 'Failed to load loan.');

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

export function loanLogsQueryOptions(params: LoanLogsQueryParams) {
  return queryOptions({
    queryKey: [LOAN_LOGS_QUERY_KEY, params.loanId, { page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans[':loanId'].logs.$get({
        param: { loanId: params.loanId },
        query: { page: String(params.page), limit: String(params.limit) },
      });

      return parseOkResponseOrThrow<LoanActivityLogsResponse>(response, 'Failed to load loan activity logs.');
    },
    enabled: !!params.loanId,
  });
}

export function installmentPaymentsQueryOptions(params: InstallmentPaymentsQueryParams) {
  return queryOptions({
    queryKey: [INSTALLMENT_PAYMENTS_QUERY_KEY, params.loanId, params.installmentId, { page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans[':loanId'].installments[':installmentId'].payments.$get({
        param: {
          loanId: params.loanId,
          installmentId: params.installmentId,
        },
        query: {
          page: String(params.page),
          limit: String(params.limit),
        },
      });

      return parseOkResponseOrThrow<InstallmentPaymentsResponse>(response, 'Failed to load installment payments.');
    },
    enabled: Boolean(params.loanId && params.installmentId),
  });
}

export function useLoans(params: LoansQueryParams) {
  return useQuery(loansQueryOptions(params));
}

export function useLoan(params: LoanQueryParams) {
  return useQuery(loanQueryOptions(params));
}

export function useLoanLogs(params: LoanLogsQueryParams) {
  return useQuery(loanLogsQueryOptions(params));
}

export function useInstallmentPayments(params: InstallmentPaymentsQueryParams) {
  return useQuery(installmentPaymentsQueryOptions(params));
}

export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body }: { body: CreateLoanBody }) => {
      const response = await apiClient.loans.$post({ json: body });
      return parseOkResponseOrThrow<CreateLoanResponse>(response, 'Failed to create loan.');
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

      return parseOkResponseOrThrow<UpdateLoanResponse>(response, 'Failed to update loan.');
    },
    onSuccess: (_data, { loanId }) => {
      invalidateLoanQueries(queryClient, { loanId });
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

      return parseOkResponseOrThrow<DeleteLoanResponse>(response, 'Failed to delete loan.');
    },
    onSuccess: (_data, loanId) => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: [LOAN_QUERY_KEY, loanId] });
      queryClient.removeQueries({ queryKey: [LOAN_LOGS_QUERY_KEY, loanId] });
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

      return parseOkResponseOrThrow<UpdateInstallmentResponse>(response, 'Failed to update installment.');
    },
    onSuccess: (_data, { loanId, installmentId }) => {
      invalidateLoanQueries(queryClient, { loanId, installmentId });
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

      return parseOkResponseOrThrow<AddInstallmentResponse>(response, 'Failed to add installment.');
    },
    onSuccess: (_data, { loanId }) => {
      invalidateLoanQueries(queryClient, { loanId });
    },
  });
}

export function useRecordInstallmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      installmentId,
      body,
    }: {
      loanId: string;
      installmentId: string;
      body: RecordInstallmentPaymentBody;
    }) => {
      const response = await apiClient.loans[':loanId'].installments[':installmentId'].payments.$post({
        param: { loanId, installmentId },
        json: body,
      });

      return parseOkResponseOrThrow<RecordInstallmentPaymentResponse>(response, 'Failed to record installment payment.');
    },
    onSuccess: (_data, { loanId, installmentId }) => {
      invalidateLoanQueries(queryClient, { loanId, installmentId });
    },
  });
}

export function useVoidInstallmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      installmentId,
      paymentId,
      body,
    }: {
      loanId: string;
      installmentId: string;
      paymentId: string;
      body: VoidInstallmentPaymentBody;
    }) => {
      const response = await apiClient.loans[':loanId'].installments[':installmentId'].payments[':paymentId'].void.$post({
        param: { loanId, installmentId, paymentId },
        json: body,
      });

      return parseOkResponseOrThrow<VoidInstallmentPaymentResponse>(response, 'Failed to void installment payment.');
    },
    onSuccess: (_data, { loanId, installmentId }) => {
      invalidateLoanQueries(queryClient, { loanId, installmentId });
    },
  });
}
