import { authClient } from './client';

// Re-export React hooks from the client
export const { useSession, $Infer } = authClient;

// Re-export sign in/up/out methods
export const { signIn, signUp, signOut, changePassword } = authClient;

// Export the full client for advanced usage
export { authClient };
