import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton, EmptyState, ErrorState } from './Feedback';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide below this breakpoint to keep tables usable on phones. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right' | 'center';
}

const hideClass = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void };
  caption?: string;
  className?: string;
  footer?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  onRowClick,
  pagination,
  caption,
  className,
  footer,
}: DataTableProps<T>) {
  if (isLoading && !rows) return <LoadingSkeleton variant="table" count={6} />;
  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} compact />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} compact />;

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-ivory-100 text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.hideBelow && hideClass[c.hideBelow], c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn('divide-y divide-ivory-200', isLoading && 'opacity-60')}>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('bg-white transition-colors', onRowClick && 'cursor-pointer hover:bg-rose-50/40')}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3.5 align-middle text-charcoal-800', c.hideBelow && hideClass[c.hideBelow], c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination ? (
        <div className="border-t border-ivory-200 px-4 py-3">
          <Pagination {...pagination} />
        </div>
      ) : null}
      {footer ? <div className="border-t border-ivory-200 px-4 py-3">{footer}</div> : null}
    </div>
  );
}
