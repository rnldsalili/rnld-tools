import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';

const ROLES_QUERY_KEY = 'roles';

export type RolesListResponse = InferResponseType<typeof apiClient.roles.$get, 200>;
export type RoleItem = RolesListResponse['data']['roles'][number];
type UpdateRolePermissionsBody = InferRequestType<(typeof apiClient.roles)[':slug']['permissions']['$put']>['json'];

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
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to update role permissions.');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['authorization'] });
    },
  });
}
