import type { EmailProviderClient } from '../../types';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const brevoEmailClient: EmailProviderClient = {
  async send(job, env) {
    if (!env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured.');
    }

    if (!env.BREVO_SENDER_EMAIL) {
      throw new Error('BREVO_SENDER_EMAIL is not configured.');
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_SENDER_EMAIL,
          ...(env.BREVO_SENDER_NAME ? { name: env.BREVO_SENDER_NAME } : {}),
        },
        to: [
          {
            email: job.recipient.email,
            ...(job.recipient.name ? { name: job.recipient.name } : {}),
          },
        ],
        subject: job.subject,
        htmlContent: job.html,
        ...(job.attachments && job.attachments.length > 0
          ? {
            attachment: job.attachments.map((attachment) => ({
              content: attachment.contentBase64,
              name: attachment.name,
            })),
          }
          : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo email send failed: ${await readErrorResponse(response)}`);
    }
  },
};

async function readErrorResponse(response: Response) {
  try {
    const payload: { message?: string; code?: string } = await response.json();
    return payload.message ?? payload.code ?? response.statusText;
  } catch {
    return await response.text();
  }
}
