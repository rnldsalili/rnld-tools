import { queryOptions, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const LOAN_ANALYTICS_QUERY_KEY = 'loan-analytics';

type LoanAnalyticsGetRoute = (typeof apiClient.loans)['analytics']['$get'];

export type LoanAnalyticsResponse = InferResponseType<LoanAnalyticsGetRoute, 200>;
export type LoanAnalyticsSummary = LoanAnalyticsResponse['data']['summary'];
export type LoanAnalyticsTrendItem = LoanAnalyticsResponse['data']['monthlyTrend'][number];
export type LoanAnalyticsAgingBucket = LoanAnalyticsResponse['data']['agingBuckets'][number];
export type LoanAnalyticsUpcomingDueItem = LoanAnalyticsResponse['data']['upcomingDue'][number];

export function loanAnalyticsQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: [LOAN_ANALYTICS_QUERY_KEY],
    enabled,
    queryFn: async () => {
      const response = await apiClient.loans.analytics.$get();
      return parseOkResponseOrThrow(response, 'Failed to load loan analytics.');
    },
  });
}

export function useLoanAnalytics(enabled = true) {
  return useQuery(loanAnalyticsQueryOptions(enabled));
}
