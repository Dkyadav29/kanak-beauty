import { apiClient } from '@/lib/api/client';
import type {
  AuthSession,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  User,
  VerifyOtpRequest,
} from '@/types';

export const authService = {
  login: async (payload: LoginRequest) => (await apiClient.post<AuthSession>('/auth/login', payload)).data,
  register: async (payload: RegisterRequest) => (await apiClient.post<RegisterResponse>('/auth/register', payload)).data,
  verifyOtp: async (payload: VerifyOtpRequest) => (await apiClient.post<AuthSession>('/auth/verify-otp', payload)).data,
  resendOtp: async (email: string) => (await apiClient.post<{ message: string }>('/auth/resend-otp', { email })).data,
  me: async () => (await apiClient.get<User>('/auth/me')).data,
  /** Revokes the given refresh token (or every token of the user when omitted). */
  logout: async (refreshToken?: string | null) =>
    (await apiClient.post<{ success: boolean }>('/auth/logout', refreshToken ? { refresh: refreshToken } : {})).data,
  forgotPassword: async (payload: ForgotPasswordRequest) =>
    (await apiClient.post<{ message: string; devResetToken?: string }>('/auth/forgot-password', payload)).data,
  resetPassword: async (payload: ResetPasswordRequest) => (await apiClient.post<{ message: string }>('/auth/reset-password', payload)).data,
};
