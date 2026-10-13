import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api/errors';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth/permission/validation failures.
          if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 400 || error.status === 409)) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });

export const AppProviders = ({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) => {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};
