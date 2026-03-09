import { createClient } from '@workspace/api-client';
const client = createClient(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');
const apiClient = client.api;
export default apiClient;
