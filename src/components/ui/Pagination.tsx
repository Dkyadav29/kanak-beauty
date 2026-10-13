import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({ page, pageSize, total, onPageChange, className }: PaginationProps) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const visible = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);

  return (
    <nav className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)} aria-label="Pagination">
      <p className="text-sm text-charcoal-500">
        Showing <span className="font-semibold text-charcoal-800">{start}</span>–<span className="font-semibold text-charcoal-800">{end}</span> of{' '}
        <span className="font-semibold text-charcoal-800">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-full p-2 text-charcoal-700 hover:bg-ivory-200 disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visible.map((p, i) => {
          const prev = visible[i - 1];
          return (
            <span key={p} className="flex items-center">
              {prev && p - prev > 1 ? <span className="px-1 text-charcoal-500">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn('h-9 min-w-9 rounded-full px-3 text-sm font-medium', p === page ? 'bg-rose-600 text-white' : 'text-charcoal-700 hover:bg-ivory-200')}
              >
                {p}
              </button>
            </span>
          );
        })}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pages} className="rounded-full p-2 text-charcoal-700 hover:bg-ivory-200 disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};
