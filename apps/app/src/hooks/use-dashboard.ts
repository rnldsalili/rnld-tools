import { queryOptions, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const DASHBOARD_QUERY_KEY = 'dashboard';

export type DashboardResponse = InferResponseType<typeof apiClient.dashboard.$get, 200>;
export type DashboardSummary = DashboardResponse['data'];
export type DashboardOverviewCard = DashboardSummary['overviewCards'][number];
export type DashboardQuickLink = DashboardSummary['quickLinks'][number];
export type DashboardLoanAttentionItem = NonNullable<DashboardSummary['loanAttention']>['items'][number];

export function dashboardQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: [DASHBOARD_QUERY_KEY],
    enabled,
    queryFn: async () => {
      const response = await apiClient.dashboard.$get();
      return parseOkResponseOrThrow(response, 'Failed to load dashboard summary.');
    },
  });
}

export function useDashboard(enabled = true) {
  return useQuery(dashboardQueryOptions(enabled));
}
