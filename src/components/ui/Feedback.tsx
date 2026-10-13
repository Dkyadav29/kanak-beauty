import type { ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from './Button';

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('h-5 w-5 animate-spin text-rose-600', className)} aria-label="Loading" />;

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-lg bg-ivory-200', className)} aria-hidden />;

export const LoadingSkeleton = ({ variant = 'cards', count = 3 }: { variant?: 'cards' | 'list' | 'table' | 'page' | 'stats'; count?: number }) => {
  if (variant === 'stats') {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div className="card overflow-hidden">
        <div className="border-b border-ivory-200 p-4">
          <Skeleton className="h-5 w-48" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-ivory-100 p-4 last:border-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4 p-4">
            <Skeleton className="h-14 w-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'page') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="aspect-[16/10] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) => (
  <div className={cn('card flex flex-col items-center justify-center text-center', compact ? 'px-6 py-10' : 'px-6 py-16', className)}>
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">{icon ?? <Inbox className="h-6 w-6" />}</div>
    <h3 className="font-display text-xl font-semibold text-charcoal-900">{title}</h3>
    {description ? <p className="mt-1.5 max-w-md text-sm text-charcoal-500">{description}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const ErrorState = ({
  error,
  title = 'Something went wrong',
  onRetry,
  className,
  compact,
}: {
  error?: unknown;
  title?: ReactNode;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) => (
  <div role="alert" className={cn('card flex flex-col items-center justify-center text-center', compact ? 'px-6 py-10' : 'px-6 py-16', className)}>
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
      <AlertCircle className="h-6 w-6" />
    </div>
    <h3 className="font-display text-xl font-semibold text-charcoal-900">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm text-charcoal-500">{error ? getErrorMessage(error) : 'Please try again.'}</p>
    {onRetry ? (
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
        Try again
      </Button>
    ) : null}
  </div>
);

export const InlineAlert = ({ tone = 'info', children, className }: { tone?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode; className?: string }) => {
  const styles = {
    info: 'border-sky-100 bg-sky-50 text-sky-800',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
    danger: 'border-red-100 bg-red-50 text-red-800',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', styles[tone], className)}>
      {children}
    </div>
  );
};

export const PageLoader = ({ label = 'Loading' }: { label?: string }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-charcoal-500">
    <Spinner className="h-7 w-7" />
    <p className="text-sm">{label}</p>
  </div>
);
