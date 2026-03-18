import { format } from 'date-fns';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_EMAIL_PROVIDERS,
  NOTIFICATION_EMAIL_PROVIDER_LABELS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_LOG_STATUSES,
  NOTIFICATION_LOG_STATUS_LABELS,
  NOTIFICATION_SMS_PROVIDERS,
  NOTIFICATION_SMS_PROVIDER_LABELS,
  NotificationChannel,
} from '@workspace/constants';
import type {
  NotificationEmailProvider,
  NotificationEvent,

  NotificationLogStatus,
  NotificationSmsProvider } from '@workspace/constants';
import type {
  NotificationEventConfigItem,
  NotificationLog,
  NotificationLogListItem,
} from '@/app/hooks/use-notifications';

type NotificationLogProviderSource = Pick<
  NotificationLogListItem,
  'channel' | 'emailProvider' | 'smsProvider'
> | Pick<
  NotificationLog,
  'channel' | 'emailProvider' | 'smsProvider'
>;

export interface NotificationEventConfigGroup {
  event: string;
  eventLabel: string;
  emailItem?: NotificationEventConfigItem;
  smsItem?: NotificationEventConfigItem;
}

export function isNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === 'string' && (NOTIFICATION_CHANNELS as ReadonlyArray<string>).includes(value);
}

export function isNotificationEmailProvider(value: unknown): value is NotificationEmailProvider {
  return typeof value === 'string' && (NOTIFICATION_EMAIL_PROVIDERS as ReadonlyArray<string>).includes(value);
}

export function isNotificationSmsProvider(value: unknown): value is NotificationSmsProvider {
  return typeof value === 'string' && (NOTIFICATION_SMS_PROVIDERS as ReadonlyArray<string>).includes(value);
}

export function isNotificationLogStatus(value: unknown): value is NotificationLogStatus {
  return typeof value === 'string' && (NOTIFICATION_LOG_STATUSES as ReadonlyArray<string>).includes(value);
}

export function getNotificationChannelLabel(channel: unknown) {
  return isNotificationChannel(channel)
    ? NOTIFICATION_CHANNEL_LABELS[channel]
    : '-';
}

export function formatNotificationDate(value?: string | Date | null) {
  if (!value) {
    return '-';
  }

  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export function getNotificationLogEventLabel(event?: NotificationEvent | null) {
  if (!event) {
    return '-';
  }

  return NOTIFICATION_EVENTS.includes(event)
    ? NOTIFICATION_EVENT_LABELS[event]
    : '-';
}

export function getNotificationLogStatusLabel(status: unknown) {
  return isNotificationLogStatus(status)
    ? NOTIFICATION_LOG_STATUS_LABELS[status]
    : '-';
}

export function getNotificationProviderLabel(notificationLog: NotificationLogProviderSource) {
  if (notificationLog.channel === NotificationChannel.EMAIL) {
    return notificationLog.emailProvider
      && isNotificationEmailProvider(notificationLog.emailProvider)
      ? NOTIFICATION_EMAIL_PROVIDER_LABELS[notificationLog.emailProvider]
      : '-';
  }

  return notificationLog.smsProvider
    && isNotificationSmsProvider(notificationLog.smsProvider)
    ? NOTIFICATION_SMS_PROVIDER_LABELS[notificationLog.smsProvider]
    : '-';
}

export function getNotificationLogRecipient(notificationLog: NotificationLogListItem) {
  if (notificationLog.channel === NotificationChannel.EMAIL) {
    if (notificationLog.recipientName && notificationLog.recipientEmail) {
      return `${notificationLog.recipientName} (${notificationLog.recipientEmail})`;
    }

    return notificationLog.recipientEmail ?? '-';
  }

  return notificationLog.recipientPhone ?? '-';
}

export function groupNotificationEventConfigs(eventConfigs: Array<NotificationEventConfigItem>) {
  return Array.from(
    eventConfigs.reduce((eventMap, item) => {
      const existingGroup = eventMap.get(item.event);
      if (existingGroup) {
        if (item.channel === NotificationChannel.EMAIL) {
          existingGroup.emailItem = item;
        } else {
          existingGroup.smsItem = item;
        }
        return eventMap;
      }

      eventMap.set(item.event, {
        event: item.event,
        eventLabel: item.eventLabel,
        emailItem: item.channel === NotificationChannel.EMAIL ? item : undefined,
        smsItem: item.channel === NotificationChannel.SMS ? item : undefined,
      });
      return eventMap;
    }, new Map<string, NotificationEventConfigGroup>()).values(),
  );
}
