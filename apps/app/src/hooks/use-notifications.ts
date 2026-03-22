import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationChannel,
  NotificationEmailProvider,
  NotificationEvent,
  NotificationLogStatus,
  NotificationSmsProvider  } from '@workspace/constants';
import type { InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const NOTIFICATION_TEMPLATES_QUERY_KEY = 'notification-templates';
const NOTIFICATION_EVENT_CONFIGS_QUERY_KEY = 'notification-event-configs';
const NOTIFICATION_LOGS_QUERY_KEY = 'notification-logs';
const NOTIFICATION_TEMPLATE_PREVIEW_QUERY_KEY = 'notification-template-preview';

type NotificationTemplatesGetRoute = typeof apiClient.notifications.templates.$get;
type NotificationTemplateGetRoute = (typeof apiClient.notifications.templates)[':id']['$get'];
type NotificationEventConfigsGetRoute = (typeof apiClient.notifications)['event-configs']['$get'];
type NotificationLogsGetRoute = typeof apiClient.notifications.logs.$get;
type NotificationLogGetRoute = (typeof apiClient.notifications.logs)[':id']['$get'];
type NotificationTestSendPostRoute = (typeof apiClient.notifications)['test-send']['$post'];
type NotificationTemplatePreviewPostRoute = (typeof apiClient.notifications)['render-preview']['$post'];

export type NotificationTemplateCreateInput =
  | {
    channel: NotificationChannel.EMAIL;
    name: string;
    description?: string;
    subject?: string;
    content?: Record<string, unknown>;
  }
  | {
    channel: NotificationChannel.SMS;
    name: string;
    description?: string;
    content?: string;
  };

export type NotificationTemplateFormValues =
  | {
    channel: NotificationChannel.EMAIL;
    name: string;
    description?: string;
    subject: string;
    content: Record<string, unknown>;
  }
  | {
    channel: NotificationChannel.SMS;
    name: string;
    description?: string;
    content: string;
  };

export type NotificationTemplateUpdateInput = NotificationTemplateFormValues & {
  id: string;
};

export type NotificationEventConfigUpdateInput = {
  event: NotificationEvent;
  channel: NotificationChannel;
  templateId: string;
  isEnabled: boolean;
  emailProvider?: NotificationEmailProvider | null;
  smsProvider?: NotificationSmsProvider | null;
};

export type NotificationTemplatesResponse = InferResponseType<
  NotificationTemplatesGetRoute,
  200
>;
export type NotificationTemplateListItem = NotificationTemplatesResponse['data']['templates'][number];

export type NotificationTemplateDetailResponse = InferResponseType<
  NotificationTemplateGetRoute,
  200
>;
export type NotificationTemplate = NotificationTemplateDetailResponse['data']['template'];

export type NotificationEventConfigsResponse = InferResponseType<
  NotificationEventConfigsGetRoute,
  200
>;
export type NotificationEventConfigItem = NotificationEventConfigsResponse['data']['eventConfigs'][number];

export type NotificationLogsResponse = InferResponseType<
  NotificationLogsGetRoute,
  200
>;
export type NotificationLogListItem = NotificationLogsResponse['data']['logs'][number];

export type NotificationLogDetailResponse = InferResponseType<
  NotificationLogGetRoute,
  200
>;
export type NotificationLog = NotificationLogDetailResponse['data']['log'];

export type NotificationTestSendInput =
  | {
    channel: NotificationChannel.EMAIL;
    event: NotificationEvent;
    templateId?: string | null;
    templateName: string;
    recipientEmail: string;
    recipientName?: string;
    emailProvider: NotificationEmailProvider;
    subject: string;
    content: Record<string, unknown>;
  }
  | {
    channel: NotificationChannel.SMS;
    event: NotificationEvent;
    templateId?: string | null;
    templateName: string;
    recipientPhone: string;
    smsProvider: NotificationSmsProvider;
    content: string;
  };

export type NotificationTestSendResponse = InferResponseType<
  NotificationTestSendPostRoute,
  202
>;

export type NotificationTemplatePreviewInput =
  | {
    channel: NotificationChannel.EMAIL;
    subject?: string;
    content: Record<string, unknown>;
  }
  | {
    channel: NotificationChannel.SMS;
    content: string;
  };

export type NotificationTemplatePreviewResponse = InferResponseType<
  NotificationTemplatePreviewPostRoute,
  200
>;

export function notificationTemplatesQueryOptions(channel?: NotificationChannel) {
  return queryOptions({
    queryKey: [NOTIFICATION_TEMPLATES_QUERY_KEY, channel ?? 'ALL'],
    queryFn: async () => {
      const response = await apiClient.notifications.templates.$get({
        query: channel ? { channel } : {},
      });
      return parseOkResponseOrThrow(response, 'Failed to load notification templates.');
    },
  });
}

export function notificationTemplateQueryOptions(id: string) {
  return queryOptions({
    queryKey: [NOTIFICATION_TEMPLATES_QUERY_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.notifications.templates[':id'].$get({
        param: { id },
      });
      const result = await parseResponse(response);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load notification template.');
      }

      return result;
    },
  });
}

export function notificationEventConfigsQueryOptions() {
  return queryOptions({
    queryKey: [NOTIFICATION_EVENT_CONFIGS_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.notifications['event-configs'].$get();
      return parseOkResponseOrThrow(response, 'Failed to load notification event configs.');
    },
  });
}

export function notificationLogsQueryOptions(params: {
  page: number;
  limit: number;
  search?: string;
  channel?: NotificationChannel;
  event?: NotificationEvent;
  status?: NotificationLogStatus;
  testSend?: boolean;
}) {
  return queryOptions({
    queryKey: [NOTIFICATION_LOGS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await apiClient.notifications.logs.$get({
        query: {
          page: String(params.page),
          limit: String(params.limit),
          ...(params.search ? { search: params.search } : {}),
          ...(params.channel ? { channel: params.channel } : {}),
          ...(params.event ? { event: params.event } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.testSend !== undefined ? { testSend: params.testSend ? 'true' : 'false' } : {}),
        },
      });
      return parseOkResponseOrThrow(response, 'Failed to load notification logs.');
    },
  });
}

export function notificationLogQueryOptions(id: string) {
  return queryOptions({
    queryKey: [NOTIFICATION_LOGS_QUERY_KEY, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.notifications.logs[':id'].$get({
        param: { id },
      });
      const result = await parseResponse(response);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load notification log.');
      }

      return result;
    },
  });
}

export function notificationTemplatePreviewQueryOptions(
  input: NotificationTemplatePreviewInput,
  enabled = true,
) {
  return queryOptions({
    queryKey: [NOTIFICATION_TEMPLATE_PREVIEW_QUERY_KEY, input],
    enabled,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await apiClient.notifications['render-preview'].$post({
        json: input,
      });
      return parseOkResponseOrThrow(response, 'Failed to render notification template preview.');
    },
  });
}

export function useNotificationTemplates(channel?: NotificationChannel) {
  return useQuery(notificationTemplatesQueryOptions(channel));
}

export function useNotificationTemplate(id: string) {
  return useQuery(notificationTemplateQueryOptions(id));
}

export function useNotificationEventConfigs() {
  return useQuery(notificationEventConfigsQueryOptions());
}

export function useNotificationLogs(params: {
  page: number;
  limit: number;
  search?: string;
  channel?: NotificationChannel;
  event?: NotificationEvent;
  status?: NotificationLogStatus;
  testSend?: boolean;
}) {
  return useQuery(notificationLogsQueryOptions(params));
}

export function useNotificationLog(id: string) {
  return useQuery(notificationLogQueryOptions(id));
}

export function useNotificationTemplatePreview(
  input: NotificationTemplatePreviewInput,
  enabled = true,
) {
  return useQuery(notificationTemplatePreviewQueryOptions(input, enabled));
}

export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: NotificationTemplateCreateInput) => {
      const response = await apiClient.notifications.templates.$post({ json: body });
      return parseOkResponseOrThrow(response, 'Failed to create notification template.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_TEMPLATES_QUERY_KEY] });
    },
  });
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: NotificationTemplateUpdateInput) => {
      const { id, ...json } = body;
      const response = await apiClient.notifications.templates[':id'].$put({
        param: { id },
        json,
      });
      return parseOkResponseOrThrow(response, 'Failed to update notification template.');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_TEMPLATES_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_EVENT_CONFIGS_QUERY_KEY] });
    },
  });
}

export function useDeleteNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.notifications.templates[':id'].$delete({
        param: { id },
      });
      return parseOkResponseOrThrow(response, 'Failed to delete notification template.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_EVENT_CONFIGS_QUERY_KEY] });
    },
  });
}

export function useUpdateNotificationEventConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: NotificationEventConfigUpdateInput) => {
      const { event, channel, ...json } = body;
      const response = await apiClient.notifications['event-configs'][':event'][':channel'].$put({
        param: { event, channel },
        json,
      });
      return parseOkResponseOrThrow(response, 'Failed to update notification event config.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_EVENT_CONFIGS_QUERY_KEY] });
    },
  });
}

export function useTestNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: NotificationTestSendInput) => {
      const response = await apiClient.notifications['test-send'].$post({
        json: body,
      });
      return parseOkResponseOrThrow(response, 'Failed to queue notification test send.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_LOGS_QUERY_KEY] });
    },
  });
}
