import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EMAIL_PROVIDERS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_CHANNELS,
  NOTIFICATION_LOG_STATUSES,
  NOTIFICATION_SMS_PROVIDERS,
  NotificationChannel,
  limitValidator,
  pageValidator,
} from '@workspace/constants';
import { z } from 'zod';

const richTextContentSchema = z.object({}).catchall(z.unknown());

export const notificationTemplateIdParamSchema = z.object({
  id: z.string().trim().length(25),
});

export const notificationTemplatesQuerySchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
});

export const notificationLogIdParamSchema = z.object({
  id: z.string().trim().length(25),
});

export const notificationLogsQuerySchema = z.object({
  search: z.string().trim().optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  event: z.enum(NOTIFICATION_EVENTS).optional(),
  status: z.enum(NOTIFICATION_LOG_STATUSES).optional(),
  testSend: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: pageValidator,
  limit: limitValidator,
});

export const createNotificationTemplateSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal(NotificationChannel.EMAIL),
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    subject: z.string().trim().min(1).optional(),
    content: richTextContentSchema.optional(),
  }),
  z.object({
    channel: z.literal(NotificationChannel.SMS),
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    content: z.string().trim().optional(),
  }),
]);

export const updateNotificationTemplateSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal(NotificationChannel.EMAIL),
    name: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
    subject: z.string().trim().min(1),
    content: richTextContentSchema,
  }),
  z.object({
    channel: z.literal(NotificationChannel.SMS),
    name: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
    content: z.string().trim().min(1),
  }),
]);

export const notificationEventConfigParamSchema = z.object({
  event: z.enum(NOTIFICATION_EVENTS),
  channel: z.enum(NOTIFICATION_CHANNELS),
}).refine(
  ({ event, channel }) => NOTIFICATION_EVENT_CHANNELS[event].includes(channel),
  {
    message: 'Unsupported notification channel for the selected event.',
    path: ['channel'],
  },
);

export const updateNotificationEventConfigSchema = z.object({
  templateId: z.string().trim().length(25),
  isEnabled: z.boolean(),
  emailProvider: z.enum(NOTIFICATION_EMAIL_PROVIDERS).optional().nullable(),
  smsProvider: z.enum(NOTIFICATION_SMS_PROVIDERS).optional().nullable(),
});

export const notificationTestSendSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal(NotificationChannel.EMAIL),
    event: z.enum(NOTIFICATION_EVENTS),
    templateId: z.string().trim().length(25).optional().nullable(),
    templateName: z.string().trim().min(1),
    recipientEmail: z.string().trim().pipe(z.email()),
    recipientName: z.string().trim().optional(),
    emailProvider: z.enum(NOTIFICATION_EMAIL_PROVIDERS),
    subject: z.string().trim().min(1),
    content: richTextContentSchema,
  }),
  z.object({
    channel: z.literal(NotificationChannel.SMS),
    event: z.enum(NOTIFICATION_EVENTS),
    templateId: z.string().trim().length(25).optional().nullable(),
    templateName: z.string().trim().min(1),
    recipientPhone: z.string().trim().min(1),
    smsProvider: z.enum(NOTIFICATION_SMS_PROVIDERS),
    content: z.string().trim().min(1),
  }),
]).refine(
  (value) => NOTIFICATION_EVENT_CHANNELS[value.event].includes(value.channel),
  {
    message: 'Unsupported notification channel for the selected event.',
    path: ['channel'],
  },
);

export const notificationTemplatePreviewSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal(NotificationChannel.EMAIL),
    subject: z.string().trim().optional(),
    content: richTextContentSchema,
  }),
  z.object({
    channel: z.literal(NotificationChannel.SMS),
    content: z.string().trim(),
  }),
]);
