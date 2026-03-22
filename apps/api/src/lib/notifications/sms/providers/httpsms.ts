import { normalizePhilippineMobileNumber } from '../philippine-mobile';
import type { SmsProviderClient } from '../../types';

const HTTPSMS_API_URL = 'https://api.httpsms.com/v1/messages/send';

interface HttpSmsResponsePayload {
  message?: string;
  error?: string;
  status?: string;
}

export const httpSmsClient: SmsProviderClient = {
  async send(job, env) {
    if (!env.HTTPSMS_API_KEY) {
      throw new Error('HTTPSMS_API_KEY is not configured.');
    }

    if (!env.HTTPSMS_FROM) {
      throw new Error('HTTPSMS_FROM is not configured.');
    }

    const payload = {
      content: job.text,
      from: normalizePhilippineMobileNumber(env.HTTPSMS_FROM, 'HTTPSMS_FROM'),
      to: normalizePhilippineMobileNumber(job.recipient.phone, 'recipient phone number'),
    };

    const response = await fetch(HTTPSMS_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': env.HTTPSMS_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responsePayload = await readHttpSmsResponse(response);

    if (!response.ok || responsePayload?.status !== 'success') {
      throw new Error(`httpSMS send failed: ${getHttpSmsErrorMessage(responsePayload) ?? response.statusText}`);
    }
  },
};

async function readHttpSmsResponse(response: Response): Promise<HttpSmsResponsePayload | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getHttpSmsErrorMessage(payload: HttpSmsResponsePayload | null) {
  if (!payload) {
    return null;
  }

  if (typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message;
  }

  if (typeof payload.error === 'string' && payload.error.length > 0) {
    return payload.error;
  }

  return null;
}
