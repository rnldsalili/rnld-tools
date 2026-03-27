import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientStatus } from '@workspace/constants';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';
import { isPlainRecord } from '@/app/lib/value-guards';

const LOANS_QUERY_KEY = 'loans';
const LOAN_QUERY_KEY = 'loan';
export const LOAN_LOGS_QUERY_KEY = 'loan-logs';
const ATTENTION_INSTALLMENTS_QUERY_KEY = 'attention-installments';
const LATEST_PAID_INSTALLMENTS_QUERY_KEY = 'latest-paid-installments';
const INSTALLMENT_PAYMENTS_QUERY_KEY = 'installment-payments';
const LOAN_ASSIGNMENTS_QUERY_KEY = 'loan-assignments';

export type LoansListResponse = InferResponseType<typeof apiClient.loans.$get, 200>;
type LoanListItemBase = LoansListResponse['data']['loans'][number];
type AttentionInstallmentsGetRoute = (typeof apiClient.loans)['installments']['attention']['$get'];
export type AttentionInstallmentsResponse = InferResponseType<AttentionInstallmentsGetRoute, 200>;
type AttentionInstallmentItemBase = AttentionInstallmentsResponse['data']['installments'][number];
type LatestPaidInstallmentsGetRoute = (typeof apiClient.loans)['installments']['latest-payments']['$get'];
export type LatestPaidInstallmentsResponse = InferResponseType<LatestPaidInstallmentsGetRoute, 200>;
type LatestPaidInstallmentItemBase = LatestPaidInstallmentsResponse['data']['installments'][number];

export type LoanDetailResponse = InferResponseType<typeof apiClient.loans[':id']['$get'], 200>;
type LoanDetailBase = LoanDetailResponse['data']['loan'];

type LoanLogsGetRoute = (typeof apiClient.loans)[':loanId']['logs']['$get'];
type InstallmentPaymentsGetRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['payments']['$get'];
type UpdateLoanRoute = (typeof apiClient.loans)[':id']['$put'];
type UpdateInstallmentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['$put'];
type DeleteInstallmentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['$delete'];
type AddInstallmentRoute = (typeof apiClient.loans)[':loanId']['installments']['$post'];
type RecordInstallmentPaymentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['payments']['$post'];
type VoidInstallmentPaymentRoute =
  (typeof apiClient.loans)[':loanId']['installments'][':installmentId']['payments'][':paymentId']['void']['$post'];

export type LoanActivityLogsResponse = InferResponseType<LoanLogsGetRoute, 200>;
export type LoanActivityLog = LoanActivityLogsResponse['data']['logs'][number];

export type InstallmentPaymentsResponse = InferResponseType<InstallmentPaymentsGetRoute, 200>;
export type InstallmentPayment = InstallmentPaymentsResponse['data']['payments'][number];

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

export type LoanAttentionInstallment = Omit<AttentionInstallmentItemBase, 'attentionCategory' | 'client' | 'status'> & {
  attentionCategory: AttentionInstallmentCategory;
  client: Pick<LoanClient, 'id' | 'name'>;
  status: string;
};

export type LoanPaidInstallment = Omit<LatestPaidInstallmentItemBase, 'client' | 'status'> & {
  client: Pick<LoanClient, 'id' | 'name'>;
  paidByUser: Pick<LoanClient, 'id' | 'name'>;
  status: string;
};

type CreateLoanBody = InferRequestType<typeof apiClient.loans.$post>['json'];
type UpdateLoanBody = InferRequestType<UpdateLoanRoute>['json'];
type UpdateInstallmentBody = InferRequestType<UpdateInstallmentRoute>['json'];
type DeleteInstallmentParams = InferRequestType<DeleteInstallmentRoute>['param'];
type AddInstallmentBody = InferRequestType<AddInstallmentRoute>['json'];
type RecordInstallmentPaymentBody = InferRequestType<RecordInstallmentPaymentRoute>['json'];
type VoidInstallmentPaymentBody = InferRequestType<VoidInstallmentPaymentRoute>['json'];

interface LoansQueryParams {
  search: string;
  page: number;
  limit: number;
  enabled?: boolean;
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

type LoanAssignmentsGetRoute = (typeof apiClient.loans)[':loanId']['assignments']['$get'];
type AssignLoanUserRoute = (typeof apiClient.loans)[':loanId']['assignments']['$post'];

export type AttentionInstallmentCategory = 'overdue' | 'near_due';

export type LoanAssignmentsResponse = InferResponseType<LoanAssignmentsGetRoute, 200>;
export type LoanAssignment = LoanAssignmentsResponse['data']['assignments'][number];
type AssignLoanUserBody = InferRequestType<AssignLoanUserRoute>['json'];

interface LoanAssignmentsQueryParams {
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

function normalizeAttentionInstallment(installment: AttentionInstallmentItemBase): LoanAttentionInstallment {
  return {
    ...installment,
    attentionCategory: getAttentionInstallmentCategory(installment),
    client: getAttentionInstallmentClient(installment),
    status: getOptionalString(installment, 'status') ?? '',
  };
}

function normalizePaidInstallment(installment: LatestPaidInstallmentItemBase): LoanPaidInstallment {
  return {
    ...installment,
    client: getAttentionInstallmentClient(installment),
    paidByUser: getInstallmentActor(installment, 'paidByUser'),
    status: getOptionalString(installment, 'status') ?? '',
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

function getAttentionInstallmentClient(installment: object): Pick<LoanClient, 'id' | 'name'> {
  return getInstallmentActor(installment, 'client');
}

function getInstallmentActor(source: object, key: string): Pick<LoanClient, 'id' | 'name'> {
  const actorValue = Reflect.get(source, key);
  if (
    isPlainRecord(actorValue)
    && typeof actorValue.id === 'string'
    && typeof actorValue.name === 'string'
  ) {
    return {
      id: actorValue.id,
      name: actorValue.name,
    };
  }

  return {
    id: '',
    name: '',
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

function getAttentionInstallmentCategory(source: object): AttentionInstallmentCategory {
  const value = Reflect.get(source, 'attentionCategory');
  return value === 'near_due' ? 'near_due' : 'overdue';
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

function invalidateLoanQueries(queryClient: ReturnType<typeof useQueryClient>, params: {
  installmentId?: string;
  loanId: string;
}) {
  queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [ATTENTION_INSTALLMENTS_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [LATEST_PAID_INSTALLMENTS_QUERY_KEY] });
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
    queryKey: [LOANS_QUERY_KEY, { search: params.search, page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans.$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
        },
      });
      const result = await parseOkResponseOrThrow(response, 'Failed to load loans.');

      return {
        ...result,
        data: {
          ...result.data,
          loans: result.data.loans.map(normalizeLoanListItem),
        },
      };
    },
    enabled: params.enabled ?? true,
  });
}

export function attentionInstallmentsQueryOptions(params: LoansQueryParams) {
  return queryOptions({
    queryKey: [ATTENTION_INSTALLMENTS_QUERY_KEY, { search: params.search, page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans.installments.attention.$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
        },
      });
      const result = await parseOkResponseOrThrow(response, 'Failed to load installments requiring attention.');

      return {
        ...result,
        data: {
          ...result.data,
          installments: result.data.installments.map(normalizeAttentionInstallment),
        },
      };
    },
    enabled: params.enabled ?? true,
  });
}

export function latestPaidInstallmentsQueryOptions(params: LoansQueryParams) {
  return queryOptions({
    queryKey: [LATEST_PAID_INSTALLMENTS_QUERY_KEY, { search: params.search, page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans.installments['latest-payments'].$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
        },
      });
      const result = await parseOkResponseOrThrow(response, 'Failed to load latest paid installments.');

      return {
        ...result,
        data: {
          ...result.data,
          installments: result.data.installments.map(normalizePaidInstallment),
        },
      };
    },
    enabled: params.enabled ?? true,
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
      const result = await parseOkResponseOrThrow(response, 'Failed to load loan.');

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

      return parseOkResponseOrThrow(response, 'Failed to load loan activity logs.');
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

      return parseOkResponseOrThrow(response, 'Failed to load installment payments.');
    },
    enabled: Boolean(params.loanId && params.installmentId),
  });
}

export function useLoans(params: LoansQueryParams) {
  return useQuery(loansQueryOptions(params));
}

export function useAttentionInstallments(params: LoansQueryParams) {
  return useQuery(attentionInstallmentsQueryOptions(params));
}

export function useLatestPaidInstallments(params: LoansQueryParams) {
  return useQuery(latestPaidInstallmentsQueryOptions(params));
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

export function loanAssignmentsQueryOptions(params: LoanAssignmentsQueryParams) {
  return queryOptions({
    queryKey: [LOAN_ASSIGNMENTS_QUERY_KEY, params.loanId, { page: params.page, limit: params.limit }],
    queryFn: async () => {
      const response = await apiClient.loans[':loanId'].assignments.$get({
        param: { loanId: params.loanId },
        query: { page: String(params.page), limit: String(params.limit) },
      });

      return parseOkResponseOrThrow(response, 'Failed to load loan assignments.');
    },
    enabled: !!params.loanId,
  });
}

export function useLoanAssignments(params: LoanAssignmentsQueryParams) {
  return useQuery(loanAssignmentsQueryOptions(params));
}

export function useAssignLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, body }: { loanId: string; body: AssignLoanUserBody }) => {
      const response = await apiClient.loans[':loanId'].assignments.$post({
        param: { loanId },
        json: body,
      });

      return parseOkResponseOrThrow(response, 'Failed to assign user to loan.');
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_ASSIGNMENTS_QUERY_KEY, loanId] });
    },
  });
}

export function useRevokeLoanAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, userId }: { loanId: string; userId: string }) => {
      const response = await apiClient.loans[':loanId'].assignments[':userId'].$delete({
        param: { loanId, userId },
      });

      return parseOkResponseOrThrow(response, 'Failed to revoke loan assignment.');
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_ASSIGNMENTS_QUERY_KEY, loanId] });
    },
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body }: { body: CreateLoanBody }) => {
      const response = await apiClient.loans.$post({ json: body });
      return parseOkResponseOrThrow(response, 'Failed to create loan.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ATTENTION_INSTALLMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LATEST_PAID_INSTALLMENTS_QUERY_KEY] });
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

      return parseOkResponseOrThrow(response, 'Failed to update loan.');
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

      return parseOkResponseOrThrow(response, 'Failed to delete loan.');
    },
    onSuccess: (_data, loanId) => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ATTENTION_INSTALLMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LATEST_PAID_INSTALLMENTS_QUERY_KEY] });
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

      return parseOkResponseOrThrow(response, 'Failed to update installment.');
    },
    onSuccess: (_data, { loanId, installmentId }) => {
      invalidateLoanQueries(queryClient, { loanId, installmentId });
    },
  });
}

export function useDeleteInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, installmentId }: DeleteInstallmentParams) => {
      const response = await apiClient.loans[':loanId'].installments[':installmentId'].$delete({
        param: { loanId, installmentId },
      });

      return parseOkResponseOrThrow(response, 'Failed to delete installment.');
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

      return parseOkResponseOrThrow(response, 'Failed to add installment.');
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

      return parseOkResponseOrThrow(response, 'Failed to record installment payment.');
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

      return parseOkResponseOrThrow(response, 'Failed to void installment payment.');
    },
    onSuccess: (_data, { loanId, installmentId }) => {
      invalidateLoanQueries(queryClient, { loanId, installmentId });
    },
  });
}
