import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientStatus } from '@workspace/constants';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

const CLIENTS_QUERY_KEY = 'clients';
const CLIENT_QUERY_KEY = 'client';
const ENABLED_CLIENTS_QUERY_KEY = 'enabled-clients';

export type ClientsListResponse = InferResponseType<typeof apiClient.clients.$get, 200>;
export type ClientListItem = ClientsListResponse['data']['clients'][number];

export type ClientDetailResponse = InferResponseType<typeof apiClient.clients[':id']['$get'], 200>;
export type ClientDetail = ClientDetailResponse['data']['client'];

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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return response.json() as Promise<ClientsListResponse>;
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

      return response.json() as Promise<ClientDetailResponse>;
    },
    enabled: !!params.clientId,
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

      return response.json();
    },
  });
}

export function useClients(params: ClientsQueryParams) {
  return useQuery(clientsQueryOptions(params));
}

export function useClient(params: ClientQueryParams) {
  return useQuery(clientQueryOptions(params));
}

export function useEnabledClients() {
  return useQuery(enabledClientsQueryOptions());
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateClientBody) => {
      const response = await apiClient.clients.$post({ json: body });
      const data = await response.json() as { meta?: { message?: string } };

      if (!response.ok) {
        throw new Error(data.meta?.message ?? 'Failed to create client.');
      }

      return data;
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
      const data = await response.json() as { meta?: { message?: string } };

      if (!response.ok) {
        throw new Error(data.meta?.message ?? 'Failed to update client.');
      }

      return data;
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
