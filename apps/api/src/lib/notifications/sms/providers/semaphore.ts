import { normalizePhilippineMobileNumber } from '../philippine-mobile';
import type { SmsProviderClient } from '../../types';

const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';

export const semaphoreSmsClient: SmsProviderClient = {
  async send(job, env) {
    if (!env.SEMAPHORE_API_KEY) {
      throw new Error('SEMAPHORE_API_KEY is not configured.');
    }

    const params = new URLSearchParams({
      apikey: env.SEMAPHORE_API_KEY,
      number: normalizePhilippineMobileNumber(job.recipient.phone, 'Semaphore phone number'),
      message: job.text,
      ...(env.SEMAPHORE_SENDER_NAME && { sendername: env.SEMAPHORE_SENDER_NAME }),
    });

    const response = await fetch(SEMAPHORE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Semaphore SMS send failed: ${await readErrorResponse(response)}`);
    }
  },
};

async function readErrorResponse(response: Response) {
  try {
    const payload: { message?: string; error?: string } = await response.json();
    return payload.message ?? payload.error ?? response.statusText;
  } catch {
    return await response.text();
  }
}
