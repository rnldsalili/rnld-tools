import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const USERS_QUERY_KEY = 'users';

export type UsersListResponse = InferResponseType<typeof apiClient.users.$get, 200>;
export type UserListItem = UsersListResponse['data']['users'][number];

type CreateUserBody = InferRequestType<typeof apiClient.users.$post>['json'];
type UpdateCurrentUserBody = InferRequestType<typeof apiClient.users.me.$put>['json'];
type UpdateUserBody = InferRequestType<(typeof apiClient.users)[':id']['$put']>['json'];
type UpdateUserRolesBody = InferRequestType<(typeof apiClient.users)[':id']['roles']['$put']>['json'];
type ChangeMyPasswordBody = InferRequestType<(typeof apiClient.users.me)['change-password']['$post']>['json'];

interface UsersQueryParams {
  search: string;
  page: number;
  limit: number;
}

export function usersQueryOptions(params: UsersQueryParams) {
  return queryOptions({
    queryKey: [USERS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await apiClient.users.$get({
        query: {
          search: params.search,
          page: String(params.page),
          limit: String(params.limit),
        },
      });
      return parseOkResponseOrThrow(response, 'Failed to load users.');
    },
  });
}

export function useUsers(params: UsersQueryParams) {
  return useQuery(usersQueryOptions(params));
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      body,
    }: {
      userId: string;
      body: UpdateUserRolesBody;
    }) => {
      const response = await apiClient.users[':id'].roles.$put({
        param: { id: userId },
        json: body,
      });
      return parseOkResponseOrThrow(response, 'Failed to update user roles.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      body,
    }: {
      userId: string;
      body: UpdateUserBody;
    }) => {
      const response = await apiClient.users[':id'].$put({
        param: { id: userId },
        json: body,
      });
      return parseOkResponseOrThrow(response, 'Failed to update user.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const response = await apiClient.users.$post({ json: body });
      return parseOkResponseOrThrow(response, 'Failed to create user.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateCurrentUserBody) => {
      const response = await apiClient.users.me.$put({ json: body });
      return parseOkResponseOrThrow(response, 'Failed to update profile.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useChangeMyPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ChangeMyPasswordBody) => {
      const response = await apiClient.users.me['change-password'].$post({ json: body });
      return parseOkResponseOrThrow(response, 'Failed to update password.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}
