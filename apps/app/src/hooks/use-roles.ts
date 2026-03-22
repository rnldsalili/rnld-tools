import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const ROLES_QUERY_KEY = 'roles';

export type RolesListResponse = InferResponseType<typeof apiClient.roles.$get, 200>;
export type RoleItem = RolesListResponse['data']['roles'][number];
type UpdateRolePermissionsBody = InferRequestType<(typeof apiClient.roles)[':slug']['permissions']['$put']>['json'];

export function rolesQueryOptions() {
  return queryOptions({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.roles.$get();
      return parseOkResponseOrThrow(response, 'Failed to load roles.');
    },
  });
}

export function useRoles() {
  return useQuery(rolesQueryOptions());
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleSlug,
      body,
    }: {
      roleSlug: string;
      body: UpdateRolePermissionsBody;
    }) => {
      const response = await apiClient.roles[':slug'].permissions.$put({
        param: { slug: roleSlug },
        json: body,
      });
      return parseOkResponseOrThrow(response, 'Failed to update role permissions.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}
