import type { Permission, Role } from '@/types';

/**
 * Default permission sets per role. These mirror what the backend returns on
 * GET /auth/me and mirror the backend's role-to-permission mapping. The UI never
 * derives authorization from this table alone: it always reads the permissions
 * attached to the authenticated user object returned by the backend.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: [
    'profile:read:self',
    'profile:update:self',
    'courses:read:enrolled',
    'live:join',
    'recordings:watch',
    'progress:update:self',
    'payments:read:self',
    'certificates:read:self',
    'referrals:read:self',
  ],
  admin: [
    'analytics:read',
    'students:read',
    'students:manage',
    'courses:manage',
    'batches:manage',
    'enrollments:read',
    'enrollments:manage',
    'payments:read',
    'payments:reconcile',
    'certificates:manage',
    'referrals:manage',
    'audit:read',
  ],
};

export const hasPermission = (userPermissions: Permission[] | undefined, required: Permission | Permission[]) => {
  if (!userPermissions) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.every((p) => userPermissions.includes(p));
};

export const hasAnyPermission = (userPermissions: Permission[] | undefined, required: Permission[]) => {
  if (!userPermissions) return false;
  return required.some((p) => userPermissions.includes(p));
};

export const homeRouteForRole = (role: Role) => (role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
