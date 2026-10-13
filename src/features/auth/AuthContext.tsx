import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onUnauthorized } from '@/lib/api/client';
import { tokenStorage } from '@/lib/api/tokenStorage';
import { hasAnyPermission, hasPermission } from '@/lib/permissions';
import { authService } from '@/services';
import type { AuthSession, Permission, Role, User } from '@/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True once the initial session check has completed. */
  isReady: boolean;
  isAuthenticated: boolean;
  /** Set when the session expired while the user was signed in. */
  sessionExpired: boolean;
  signIn: (session: AuthSession) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  can: (permission: Permission | Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionExpired, setSessionExpired] = useState(false);
  const qc = useQueryClient();
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
    qc.clear();
  }, [qc]);

  // Boot: if a token exists, ask the backend who we are. The role and
  // permissions always come from the server, never from storage.
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!tokenStorage.get()) {
        setStatus('anonymous');
        return;
      }
      try {
        const me = await authService.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) clearSession();
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Session expiry (401 from any API call).
  useEffect(
    () =>
      onUnauthorized(() => {
        if (userRef.current) setSessionExpired(true);
        clearSession();
      }),
    [clearSession],
  );

  const signIn = useCallback((session: AuthSession) => {
    tokenStorage.set(session.accessToken, session.refreshToken);
    setUser(session.user);
    setStatus('authenticated');
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.logout(tokenStorage.getRefresh());
    } catch {
      /* best effort: the local session is cleared regardless */
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isReady: status !== 'loading',
      isAuthenticated: status === 'authenticated' && !!user,
      sessionExpired,
      signIn,
      signOut,
      refreshUser,
      hasRole: (role) => user?.role === role,
      can: (permission) => hasPermission(user?.permissions, permission),
      canAny: (permissions) => hasAnyPermission(user?.permissions, permissions),
    }),
    [status, user, sessionExpired, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
