import { useEffect, useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, Select } from './Form';
import { Button } from './Button';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  type?: 'select' | 'date';
  options?: FilterOption[];
}

export interface SearchAndFiltersProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  values?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onReset?: () => void;
  actions?: ReactNode;
  className?: string;
}

/** Debounced search box with inline filters; collapses behind a toggle on phones. */
export const SearchAndFilters = ({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  values = {},
  onFilterChange,
  onReset,
  actions,
  className,
}: SearchAndFiltersProps) => {
  const [local, setLocal] = useState(search);
  const [open, setOpen] = useState(false);

  useEffect(() => setLocal(search), [search]);
  useEffect(() => {
    if (!onSearchChange || local === search) return;
    const t = setTimeout(() => onSearchChange(local), 300);
    return () => clearTimeout(t);
  }, [local, search, onSearchChange]);

  const activeCount = filters.filter((f) => values[f.key] && values[f.key] !== 'all').length;

  return (
    <div className={cn('card p-3 sm:p-4', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {onSearchChange ? (
          <div className="flex-1">
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={searchPlaceholder} leftIcon={<Search className="h-4 w-4" />} aria-label={searchPlaceholder} />
          </div>
        ) : null}
        {filters.length > 0 ? (
          <Button variant="outline" size="sm" className="md:hidden" onClick={() => setOpen((o) => !o)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
            Filters{activeCount ? ` (${activeCount})` : ''}
          </Button>
        ) : null}
        <div className={cn('grid gap-3 sm:grid-cols-2 md:flex md:items-center', filters.length > 0 && !open && 'hidden md:flex')}>
          {filters.map((f) =>
            f.type === 'date' ? (
              <Input key={f.key} type="date" value={values[f.key] ?? ''} onChange={(e) => onFilterChange?.(f.key, e.target.value)} aria-label={f.label} className="md:w-40" />
            ) : (
              <Select key={f.key} value={values[f.key] ?? 'all'} onChange={(e) => onFilterChange?.(f.key, e.target.value)} aria-label={f.label} className="md:w-44">
                <option value="all">{f.label}: All</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ),
          )}
          {onReset && (activeCount > 0 || search) ? (
            <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<X className="h-4 w-4" />}>
              Clear
            </Button>
          ) : null}
        </div>
        {actions ? <div className="md:ml-auto">{actions}</div> : null}
      </div>
    </div>
  );
};
