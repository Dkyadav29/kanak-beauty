import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { tokenStorage } from './tokenStorage';
import { toApiError } from './errors';

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to session-expiry events (401 that could not be recovered by a token refresh). Used by AuthProvider. */
export const onUnauthorized = (listener: UnauthorizedListener) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

/**
 * Public auth endpoints answer 401/400 for bad credentials or codes. Those are
 * user errors, not an expired session, so they never trigger a refresh or sign-out.
 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/token/refresh',
];
const isPublicAuthPath = (url: string) => PUBLIC_AUTH_PATHS.some((p) => url.startsWith(p));

const baseHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };

/**
 * Make a URL returned by the backend usable from the browser. Media endpoints
 * (recording streams, downloads) come back as paths relative to the API host,
 * which differs from the frontend origin in development; absolute URLs and
 * data URLs are returned unchanged.
 */
export const resolveApiUrl = (url: string): string => {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
  const apiOrigin = new URL(env.apiBaseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').origin;
  return new URL(url, apiOrigin).toString();
};

/**
 * Bare client for the refresh call. It has no interceptors, so a failing
 * refresh can never recurse into another refresh attempt.
 */
export const tokenRefreshClient = axios.create({ baseURL: env.apiBaseUrl, timeout: 20_000, headers: baseHeaders });

interface TokenRefreshResponse {
  access: string;
  refresh: string;
  expiresAt: string;
}

let inflightRefresh: Promise<string | null> | null = null;

/**
 * Exchange the stored refresh token for a new pair. Concurrent callers share a
 * single request (the backend rotates and blacklists the old refresh token, so
 * two parallel refreshes would invalidate each other).
 */
const refreshAccessToken = (): Promise<string | null> => {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return Promise.resolve(null);
  if (!inflightRefresh) {
    inflightRefresh = tokenRefreshClient
      .post<TokenRefreshResponse>('/auth/token/refresh', { refresh })
      .then((res) => {
        tokenStorage.set(res.data.access, res.data.refresh);
        return res.data.access;
      })
      .catch(() => null)
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const createClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 20_000,
    headers: baseHeaders,
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    // Lets the backend build absolute share links (referral, verification) for this deployment.
    if (env.publicSiteUrl) config.headers.set('X-Public-Origin', env.publicSiteUrl);
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const apiError = toApiError(error);
      const config = error?.config as RetriableConfig | undefined;
      const url: string = config?.url ?? '';

      if (apiError.isUnauthorized && config && !isPublicAuthPath(url)) {
        // First 401: the access token has probably expired. Refresh once and replay the request.
        if (!config._retried) {
          const token = await refreshAccessToken();
          if (token) {
            config._retried = true;
            config.headers.set('Authorization', `Bearer ${token}`);
            return instance.request(config);
          }
        }
        // No refresh token, refresh rejected, or the replay also failed: the session is gone.
        tokenStorage.clear();
        unauthorizedListeners.forEach((l) => l());
      }
      return Promise.reject(apiError);
    },
  );

  return instance;
};

export const apiClient = createClient();
