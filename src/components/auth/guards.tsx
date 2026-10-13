import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { homeRouteForRole } from '@/lib/permissions';
import type { Permission, Role } from '@/types';
import { PageLoader } from '@/components/ui';
import { ForbiddenPage } from '@/pages/ErrorPages';

/**
 * Route guards. These shape navigation only: the backend independently
 * enforces every permission, so a bypassed guard still yields 401/403.
 */

/** Requires an authenticated session; redirects to /login preserving the destination. */
export const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isReady) return <PageLoader label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children ? <>{children}</> : <Outlet />;
};

/** Requires a specific role. Other roles see a 403 page (no redirect loops, no data leak). */
export const RequireRole = ({ role, children, redirect }: { role: Role; children?: ReactNode; redirect?: boolean }) => {
  const { isReady, isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isReady) return <PageLoader label="Checking your session" />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) {
    if (redirect) return <Navigate to={homeRouteForRole(user.role)} replace />;
    return <ForbiddenPage />;
  }
  return children ? <>{children}</> : <Outlet />;
};

/** Requires one or more permissions from the authenticated user object. */
export const RequirePermission = ({ permission, children }: { permission: Permission | Permission[]; children?: ReactNode }) => {
  const { isReady, isAuthenticated, can } = useAuth();
  const location = useLocation();
  if (!isReady) return <PageLoader label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!can(permission)) return <ForbiddenPage />;
  return children ? <>{children}</> : <Outlet />;
};

/** Inline gate for UI elements (buttons, menu items). Renders fallback when not permitted. */
export const PermissionGate = ({
  permission,
  anyOf,
  role,
  children,
  fallback = null,
}: {
  permission?: Permission | Permission[];
  anyOf?: Permission[];
  role?: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { can, canAny, hasRole } = useAuth();
  if (role && !hasRole(role)) return <>{fallback}</>;
  if (permission && !can(permission)) return <>{fallback}</>;
  if (anyOf && !canAny(anyOf)) return <>{fallback}</>;
  return <>{children}</>;
};

/** Sends already-authenticated users away from auth pages to their dashboard. */
export const GuestOnly = ({ children }: { children: ReactNode }) => {
  const { isReady, isAuthenticated, user } = useAuth();
  if (!isReady) return <PageLoader />;
  if (isAuthenticated && user) return <Navigate to={homeRouteForRole(user.role)} replace />;
  return <>{children}</>;
};
