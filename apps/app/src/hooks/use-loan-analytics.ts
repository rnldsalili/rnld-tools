import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
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
export type LoanAnalyticsEarningsRange = LoanAnalyticsResponse['data']['earnings']['range'];
export type LoanAnalyticsEarningsSummary = LoanAnalyticsResponse['data']['earnings']['summary'];
export type LoanAnalyticsEarningsTrendItem = LoanAnalyticsResponse['data']['earnings']['trend'][number];

type LoanAnalyticsQueryParams = {
  enabled?: boolean;
  startDate?: string;
  endDate?: string;
};

export function loanAnalyticsQueryOptions(params: LoanAnalyticsQueryParams = {}) {
  return queryOptions({
    queryKey: [LOAN_ANALYTICS_QUERY_KEY, { startDate: params.startDate, endDate: params.endDate }],
    enabled: params.enabled ?? true,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await apiClient.loans.analytics.$get({
        query: {
          startDate: params.startDate,
          endDate: params.endDate,
        },
      });
      return parseOkResponseOrThrow(response, 'Failed to load loan analytics.');
    },
  });
}

export function useLoanAnalytics(params: LoanAnalyticsQueryParams = {}) {
  return useQuery(loanAnalyticsQueryOptions(params));
}
