import type { SmsProviderClient } from '../../types';

const PHILSMS_API_URL = 'https://dashboard.philsms.com/api/v3/sms/send';
const GSM_7_BASIC_CHARACTERS = new Set(
  Array.from(`@£$¥èéùìòÇ
Øø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\\ÆæßÉ !"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ\`¿abcdefghijklmnopqrstuvwxyzäöñüà`),
);
const GSM_7_EXTENDED_CHARACTERS = new Set(Array.from('^{}\\[~]|€'));

interface PhilSmsResponsePayload {
  status?: string;
  message?: string;
  error?: string;
  data?: unknown;
}

export const philsmsSmsClient: SmsProviderClient = {
  async send(job, env) {
    if (!env.PHILSMS_API_TOKEN) {
      throw new Error('PHILSMS_API_TOKEN is not configured.');
    }

    if (!env.PHILSMS_SENDER_ID) {
      throw new Error('PHILSMS_SENDER_ID is not configured.');
    }

    const payload = {
      recipient: normalizePhilSmsPhoneNumber(job.recipient.phone),
      sender_id: env.PHILSMS_SENDER_ID,
      type: getPhilSmsMessageType(job.text),
      message: job.text,
    };

    const response = await fetch(PHILSMS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PHILSMS_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responsePayload = await readPhilSmsResponse(response);

    if (!response.ok || responsePayload?.status === 'error') {
      throw new Error(`PhilSMS SMS send failed: ${getPhilSmsErrorMessage(responsePayload) ?? response.statusText}`);
    }
  },
};

export function normalizePhilSmsPhoneNumber(phoneNumber: string) {
  const trimmedPhoneNumber = phoneNumber.trim();
  const compactPhoneNumber = trimmedPhoneNumber.startsWith('+')
    ? `+${trimmedPhoneNumber.slice(1).replace(/\D/g, '')}`
    : trimmedPhoneNumber.replace(/\D/g, '');

  if (/^639\d{9}$/.test(compactPhoneNumber)) {
    return compactPhoneNumber;
  }

  if (/^\+639\d{9}$/.test(compactPhoneNumber)) {
    return compactPhoneNumber.slice(1);
  }

  if (/^09\d{9}$/.test(compactPhoneNumber)) {
    return `63${compactPhoneNumber.slice(1)}`;
  }

  if (/^9\d{9}$/.test(compactPhoneNumber)) {
    return `63${compactPhoneNumber}`;
  }

  throw new Error('PhilSMS phone number must be a valid Philippine mobile number.');
}

export function getPhilSmsMessageType(message: string) {
  return isGsm7Compatible(message) ? 'plain' : 'unicode';
}

function isGsm7Compatible(message: string) {
  for (const character of message) {
    if (GSM_7_BASIC_CHARACTERS.has(character) || GSM_7_EXTENDED_CHARACTERS.has(character)) {
      continue;
    }

    return false;
  }

  return true;
}

async function readPhilSmsResponse(response: Response): Promise<PhilSmsResponsePayload | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getPhilSmsErrorMessage(payload: PhilSmsResponsePayload | null) {
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
