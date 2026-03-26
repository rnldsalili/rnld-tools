import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientStatus } from '@workspace/constants';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const CLIENTS_QUERY_KEY = 'clients';
const CLIENT_QUERY_KEY = 'client';
const CLIENT_LOANS_QUERY_KEY = 'client-loans';
const ENABLED_CLIENTS_QUERY_KEY = 'enabled-clients';

export type ClientsListResponse = InferResponseType<typeof apiClient.clients.$get, 200>;
export type ClientListItem = ClientsListResponse['data']['clients'][number];

export type ClientDetailResponse = InferResponseType<typeof apiClient.clients[':id']['$get'], 200>;
export type ClientDetail = ClientDetailResponse['data']['client'];
type ClientLoansGetRoute = (typeof apiClient.clients)[':id']['loans']['$get'];
export type ClientLoansResponse = InferResponseType<ClientLoansGetRoute, 200>;
export type ClientLoanListItem = ClientLoansResponse['data']['loans'][number];

type CreateClientBody = InferRequestType<typeof apiClient.clients.$post>['json'];
type UpdateClientBody = InferRequestType<typeof apiClient.clients[':id']['$put']>['json'];

interface ClientsQueryParams {
  search: string;
  page: number;
  limit: number;
  status?: ClientStatus;
}

interface ClientQueryParams {
  clientId: string;
}

interface ClientLoansQueryParams {
  clientId: string;
  enabled?: boolean;
}

export function clientsQueryOptions(params: ClientsQueryParams) {
  return queryOptions({
    queryKey: [CLIENTS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await apiClient.clients.$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
          ...(params.status ? { status: params.status } : {}),
        },
      });
      return parseOkResponseOrThrow(response, 'Failed to load clients.');
    },
  });
}

export function clientQueryOptions(params: ClientQueryParams) {
  return queryOptions({
    queryKey: [CLIENT_QUERY_KEY, params.clientId],
    queryFn: async () => {
      const response = await apiClient.clients[':id'].$get({
        param: { id: params.clientId },
      });
      return parseOkResponseOrThrow(response, 'Failed to load client.');
    },
    enabled: !!params.clientId,
  });
}

export function clientLoansQueryOptions(params: ClientLoansQueryParams) {
  return queryOptions({
    queryKey: [CLIENT_LOANS_QUERY_KEY, params.clientId],
    queryFn: async () => {
      const response = await apiClient.clients[':id'].loans.$get({
        param: { id: params.clientId },
      });
      return parseOkResponseOrThrow(response, 'Failed to load client loans.');
    },
    enabled: Boolean(params.clientId) && (params.enabled ?? true),
  });
}

export function enabledClientsQueryOptions() {
  return queryOptions({
    queryKey: [ENABLED_CLIENTS_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.clients.$get({
        query: {
          page: '1',
          limit: '1000',
          status: ClientStatus.ENABLED,
        },
      });
      return parseOkResponseOrThrow(response, 'Failed to load clients.');
    },
  });
}

export function useClients(params: ClientsQueryParams) {
  return useQuery(clientsQueryOptions(params));
}

export function useClient(params: ClientQueryParams) {
  return useQuery(clientQueryOptions(params));
}

export function useClientLoans(params: ClientLoansQueryParams) {
  return useQuery(clientLoansQueryOptions(params));
}

export function useEnabledClients() {
  return useQuery(enabledClientsQueryOptions());
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateClientBody) => {
      const response = await apiClient.clients.$post({ json: body });
      return parseOkResponseOrThrow(response, 'Failed to create client.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ENABLED_CLIENTS_QUERY_KEY] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      body,
    }: {
      clientId: string;
      body: UpdateClientBody;
    }) => {
      const response = await apiClient.clients[':id'].$put({
        param: { id: clientId },
        json: body,
      });
      return parseOkResponseOrThrow(response, 'Failed to update client.');
    },
    onSuccess: (_data, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [CLIENT_QUERY_KEY, clientId] });
      queryClient.invalidateQueries({ queryKey: [ENABLED_CLIENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan'] });
    },
  });
}
