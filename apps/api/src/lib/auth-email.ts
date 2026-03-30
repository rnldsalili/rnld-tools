import {
  NotificationChannel,
  NotificationEmailProvider,
} from '@workspace/constants';
import type { NotificationEnv } from '@/api/lib/notifications/types';
import { getEmailProviderStatus } from '@/api/lib/notifications/config';
import { renderNotificationEmail } from '@/api/lib/notifications/email-shell/render';
import {
  createNotificationLog,
  markNotificationLogQueueFailed,
} from '@/api/lib/notifications/logs';
import { getNotificationSiteUrl } from '@/api/lib/notifications/placeholders';
import { enqueueEmailNotificationJob } from '@/api/lib/notifications/queue';

const FORGOT_PASSWORD_EMAIL_PROVIDER = NotificationEmailProvider.BREVO;
const FORGOT_PASSWORD_OTP_EXPIRY_MINUTES = 5;
const FORGOT_PASSWORD_EMAIL_SUBJECT = 'Reset your RTools password';

interface SendForgotPasswordOtpEmailParams {
  email: string;
  otp: string;
}

export async function sendForgotPasswordOtpEmail(
  env: NotificationEnv,
  params: SendForgotPasswordOtpEmailParams,
) {
  const providerStatus = getEmailProviderStatus(env)[FORGOT_PASSWORD_EMAIL_PROVIDER];

  if (!providerStatus.configured) {
    throw new Error('The configured email provider for password reset is unavailable.');
  }

  const siteUrl = getNotificationSiteUrl(env);
  const loginUrl = new URL('/login', siteUrl).toString();
  const renderedEmail = renderNotificationEmail({
    subject: FORGOT_PASSWORD_EMAIL_SUBJECT,
    bodyHtml: [
      '<p>Hello,</p>',
      '<p>Use the one-time password below to reset your RTools password.</p>',
      '<div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#f8fafc;border:1px solid #dbe4ee;text-align:center;">',
      '<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">Verification code</p>',
      `<p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#0f172a;">${params.otp}</p>`,
      '</div>',
      `<p>This code expires in ${FORGOT_PASSWORD_OTP_EXPIRY_MINUTES} minutes.</p>`,
      '<p>If you did not request a password reset, you can safely ignore this email.</p>',
      `<p><a href="${loginUrl}" style="color:#2563eb;text-decoration:none;">Return to login</a></p>`,
    ].join(''),
  });

  const notificationLog = await createNotificationLog(env, {
    channel: NotificationChannel.EMAIL,
    event: null,
    provider: FORGOT_PASSWORD_EMAIL_PROVIDER,
    recipientEmail: params.email,
    recipientName: null,
    subject: renderedEmail.subject,
    messageContent: renderedEmail.html,
    queuedAt: new Date().toISOString(),
    queuedByUserId: null,
    isTestSend: false,
  });

  try {
    await enqueueEmailNotificationJob(env, {
      notificationLogId: notificationLog.id,
      channel: NotificationChannel.EMAIL,
      provider: FORGOT_PASSWORD_EMAIL_PROVIDER,
      recipient: {
        email: params.email,
        name: null,
      },
      subject: renderedEmail.subject,
      html: renderedEmail.html,
      trace: {
        event: null,
        queuedAt: notificationLog.queuedAt.toISOString(),
        queuedByUserId: null,
        testSend: false,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to queue password reset email.';

    await markNotificationLogQueueFailed(env, {
      notificationLogId: notificationLog.id,
      errorMessage,
    });

    throw error;
  }
}
