import axios from 'axios';
import type { ApiErrorPayload } from '@/types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, payload: Partial<ApiErrorPayload> & { message: string }) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code ?? 'UNKNOWN';
    this.details = payload.details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
}

/** Convert any thrown value into an ApiError with a user-safe message. */
export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as Partial<ApiErrorPayload> | undefined;
    if (status === 0) {
      return new ApiError(0, { code: 'NETWORK', message: 'Unable to reach the server. Please check your connection.' });
    }
    return new ApiError(status, {
      code: data?.code ?? `HTTP_${status}`,
      message: data?.message ?? defaultMessage(status),
      details: data?.details,
    });
  }
  if (error instanceof Error) return new ApiError(0, { code: 'CLIENT', message: error.message });
  return new ApiError(0, { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' });
};

const defaultMessage = (status: number) => {
  switch (status) {
    case 400:
      return 'The request was invalid.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with the current state.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return status >= 500 ? 'The server encountered an error. Please try again later.' : 'Request failed.';
  }
};

export const getErrorMessage = (error: unknown) => toApiError(error).message;
