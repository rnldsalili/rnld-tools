import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';

const ROLES_QUERY_KEY = 'roles';

export type RolesListResponse = InferResponseType<typeof apiClient.roles.$get, 200>;
export type RoleItem = RolesListResponse['data']['roles'][number];
export type RoleDetailResponse = InferResponseType<(typeof apiClient.roles)[':id']['$get'], 200>;

type CreateRoleBody = InferRequestType<typeof apiClient.roles.$post>['json'];
type UpdateRoleBody = InferRequestType<(typeof apiClient.roles)[':id']['$put']>['json'];

export function rolesQueryOptions() {
  return queryOptions({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.roles.$get();
      const httpResponse: Response = response;
      const result = await parseResponse(response);

      if (!httpResponse.ok) {
        throw new Error(result.meta.message || 'Failed to load roles.');
      }

      return result;
    },
  });
}

export function useRoles() {
  return useQuery(rolesQueryOptions());
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateRoleBody) => {
      const response = await apiClient.roles.$post({ json: body });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to create role.');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateRoleBody }) => {
      const response = await apiClient.roles[':id'].$put({
        param: { id },
        json: body,
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to update role.');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await apiClient.roles[':id'].$delete({
        param: { id: roleId },
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to delete role.');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}
