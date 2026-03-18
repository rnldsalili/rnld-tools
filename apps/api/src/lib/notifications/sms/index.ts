import { NotificationSmsProvider } from '@workspace/constants';
import { philsmsSmsClient } from './providers/philsms';
import { semaphoreSmsClient } from './providers/semaphore';
import type { SmsProviderClient } from '../types';

const smsProviderClients: Record<NotificationSmsProvider, SmsProviderClient> = {
  [NotificationSmsProvider.PHILSMS]: philsmsSmsClient,
  [NotificationSmsProvider.SEMAPHORE]: semaphoreSmsClient,
};

export function getSmsProviderClient(provider: NotificationSmsProvider) {
  return smsProviderClients[provider];
}
