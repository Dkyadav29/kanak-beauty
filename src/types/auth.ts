import type { ISODateString } from './common';

export type Role = 'student' | 'admin';

/**
 * Centralised permission vocabulary. The backend is the source of truth:
 * permissions are returned with the authenticated user and the backend must
 * enforce them on every request regardless of what the UI shows.
 */
export type Permission =
  // student scope - always limited to the caller's own resources
  | 'profile:read:self'
  | 'profile:update:self'
  | 'courses:read:enrolled'
  | 'live:join'
  | 'recordings:watch'
  | 'progress:update:self'
  | 'payments:read:self'
  | 'certificates:read:self'
  | 'referrals:read:self'
  // admin scope
  | 'analytics:read'
  | 'students:read'
  | 'students:manage'
  | 'courses:manage'
  | 'batches:manage'
  | 'enrollments:read'
  | 'enrollments:manage'
  | 'payments:read'
  | 'payments:reconcile'
  | 'certificates:manage'
  | 'referrals:manage'
  | 'audit:read';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  permissions: Permission[];
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: ISODateString;
}

export interface NotificationPreferences {
  liveClassReminders: boolean;
  courseUpdates: boolean;
  paymentReceipts: boolean;
  marketing: boolean;
}

export interface StudentProfile extends User {
  dateOfBirth: string | null;
  address: string | null;
  notificationPreferences: NotificationPreferences;
}

export interface AuthSession {
  accessToken: string;
  /** Rotated by the backend on every refresh; revoked on logout. */
  refreshToken: string;
  /** Expiry of the access token. */
  expiresAt: ISODateString;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  mobile: string;
  password: string;
  /** Optional referral code from an existing student (Refer & Earn). */
  referralCode?: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  verificationRequired: boolean;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  mobile?: string;
  dateOfBirth?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  notificationPreferences?: Partial<NotificationPreferences>;
}
