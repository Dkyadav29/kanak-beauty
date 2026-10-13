/**
 * Axios client behaviour against the real backend contract: bearer header,
 * silent token refresh on 401 with a single shared refresh request, and
 * sign-out notification when the refresh cannot recover the session.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { apiClient, onUnauthorized, resolveApiUrl, tokenRefreshClient } from '@/lib/api/client';
import { tokenStorage } from '@/lib/api/tokenStorage';
import { ApiError } from '@/lib/api/errors';

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

const adapterFor =
  (handler: Handler): AxiosAdapter =>
  async (config) => {
    const { status, data } = handler(config);
    const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError('Request failed', status === 401 ? 'ERR_UNAUTHORIZED' : 'ERR_BAD_RESPONSE', config, {}, response);
  };

const bearer = (config: InternalAxiosRequestConfig) => AxiosHeaders.from(config.headers).get('Authorization');

beforeEach(() => {
  tokenStorage.clear();
});

describe('resolveApiUrl', () => {
  it('prefixes API-relative media paths with the API origin and leaves absolute URLs alone', () => {
    expect(resolveApiUrl('/api/v1/media/recordings/abc')).toBe('http://localhost:8000/api/v1/media/recordings/abc');
    expect(resolveApiUrl('https://cdn.example.com/v.mp4')).toBe('https://cdn.example.com/v.mp4');
    expect(resolveApiUrl('data:image/jpeg;base64,AAA')).toBe('data:image/jpeg;base64,AAA');
  });
});

describe('apiClient', () => {
  it('sends the stored access token as a bearer header', async () => {
    tokenStorage.set('access-1', 'refresh-1');
    const seen: unknown[] = [];
    apiClient.defaults.adapter = adapterFor((c) => {
      seen.push(bearer(c));
      return { status: 200, data: { ok: true } };
    });
    await apiClient.get('/auth/me');
    expect(seen).toEqual(['Bearer access-1']);
  });

  it('refreshes once on 401, replays the request with the new token and rotates the refresh token', async () => {
    tokenStorage.set('expired', 'refresh-1');
    const refreshCalls: unknown[] = [];
    tokenRefreshClient.defaults.adapter = adapterFor((c) => {
      refreshCalls.push(JSON.parse(String(c.data)));
      return { status: 200, data: { access: 'access-2', refresh: 'refresh-2', expiresAt: '2030-01-01T00:00:00Z' } };
    });
    const seen: unknown[] = [];
    apiClient.defaults.adapter = adapterFor((c) => {
      const token = bearer(c);
      seen.push(token);
      return token === 'Bearer access-2' ? { status: 200, data: { id: 'u1' } } : { status: 401, data: { code: 'UNAUTHENTICATED', message: 'expired' } };
    });

    const res = await apiClient.get('/student/dashboard');

    expect(res.data).toEqual({ id: 'u1' });
    expect(seen).toEqual(['Bearer expired', 'Bearer access-2']);
    expect(refreshCalls).toEqual([{ refresh: 'refresh-1' }]);
    expect(tokenStorage.get()).toBe('access-2');
    expect(tokenStorage.getRefresh()).toBe('refresh-2');
  });

  it('shares a single refresh between concurrent 401s', async () => {
    tokenStorage.set('expired', 'refresh-1');
    let refreshCount = 0;
    tokenRefreshClient.defaults.adapter = adapterFor(() => {
      refreshCount += 1;
      return { status: 200, data: { access: 'access-2', refresh: 'refresh-2', expiresAt: '2030-01-01T00:00:00Z' } };
    });
    apiClient.defaults.adapter = adapterFor((c) =>
      bearer(c) === 'Bearer access-2' ? { status: 200, data: c.url } : { status: 401, data: { code: 'UNAUTHENTICATED', message: 'expired' } },
    );

    const results = await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);

    expect(results.map((r) => r.data)).toEqual(['/a', '/b', '/c']);
    expect(refreshCount).toBe(1);
  });

  it('clears the session and notifies listeners when the refresh is rejected', async () => {
    tokenStorage.set('expired', 'refresh-revoked');
    tokenRefreshClient.defaults.adapter = adapterFor(() => ({ status: 401, data: { code: 'UNAUTHENTICATED', message: 'blacklisted' } }));
    apiClient.defaults.adapter = adapterFor(() => ({ status: 401, data: { code: 'UNAUTHENTICATED', message: 'expired' } }));
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);

    await expect(apiClient.get('/student/dashboard')).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(tokenStorage.get()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    unsubscribe();
  });

  it('treats a 401 from the login endpoint as a credential error, not an expired session', async () => {
    tokenStorage.set('access-1', 'refresh-1');
    const refresh = vi.fn();
    tokenRefreshClient.defaults.adapter = adapterFor(() => {
      refresh();
      return { status: 200, data: {} };
    });
    apiClient.defaults.adapter = adapterFor(() => ({ status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' } }));
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);

    const error = await apiClient.post('/auth/login', { email: 'a@b.c', password: 'x' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('INVALID_CREDENTIALS');
    expect(refresh).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(tokenStorage.get()).toBe('access-1');
    unsubscribe();
  });
});
