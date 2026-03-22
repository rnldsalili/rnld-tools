import { NotificationSmsProvider } from '@workspace/constants';
import { httpSmsClient } from './providers/httpsms';
import { philsmsSmsClient } from './providers/philsms';
import { semaphoreSmsClient } from './providers/semaphore';
import type { SmsProviderClient } from '../types';

const smsProviderClients: Record<NotificationSmsProvider, SmsProviderClient> = {
  [NotificationSmsProvider.HTTPSMS]: httpSmsClient,
  [NotificationSmsProvider.PHILSMS]: philsmsSmsClient,
  [NotificationSmsProvider.SEMAPHORE]: semaphoreSmsClient,
};

export function getSmsProviderClient(provider: NotificationSmsProvider) {
  return smsProviderClients[provider];
}
