import { NotificationEmailProvider } from '@workspace/constants';
import { brevoEmailClient } from './providers/brevo';
import type { EmailProviderClient } from '../types';

const emailProviderClients: Record<NotificationEmailProvider, EmailProviderClient> = {
  [NotificationEmailProvider.BREVO]: brevoEmailClient,
};

export function getEmailProviderClient(provider: NotificationEmailProvider) {
  return emailProviderClients[provider];
}
