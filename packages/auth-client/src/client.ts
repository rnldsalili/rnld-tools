import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

// Get API base URL from environment or default to localhost
const getBaseURL = () => {
  // @ts-ignore - VITE_API_URL is available in Vite environments
  return import.meta.env?.VITE_API_URL || 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    emailOTPClient(),
  ],
});
