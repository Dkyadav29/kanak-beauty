/**
 * Centralised, typed access to environment configuration.
 * All runtime config comes from Vite env variables (see .env.example).
 */
const read = (key: keyof ImportMetaEnv, fallback = ''): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

export const env = {
  apiBaseUrl: read('VITE_API_BASE_URL', 'http://localhost:8000/api/v1'),
  publicSiteUrl: read('VITE_PUBLIC_SITE_URL', typeof window !== 'undefined' ? window.location.origin : ''),
  /** Sandbox checkout controls; the backend exposes the matching endpoint only when PAYMENT_GATEWAY=sandbox. */
  paymentSandbox: read('VITE_PAYMENT_SANDBOX', 'false') === 'true',
  isDev: import.meta.env.DEV,
} as const;
