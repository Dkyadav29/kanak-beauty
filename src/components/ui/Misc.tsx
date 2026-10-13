import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn, initials } from '@/lib/utils';

export const Avatar = ({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) => {
  const [broken, setBroken] = useState(false);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base', xl: 'h-24 w-24 text-2xl' };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-100 font-semibold text-rose-700 ring-2 ring-white', sizes[size], className)}>
      {src && !broken ? <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  );
};

export const ProgressBar = ({ value, className, tone = 'rose', showLabel, size = 'md' }: { value: number; className?: string; tone?: 'rose' | 'gold' | 'success'; showLabel?: boolean; size?: 'sm' | 'md' }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const bar = { rose: 'bg-rose-500', gold: 'bg-gold-500', success: 'bg-emerald-500' }[tone];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 overflow-hidden rounded-full bg-ivory-200', size === 'sm' ? 'h-1.5' : 'h-2')} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${v}%` }} />
      </div>
      {showLabel ? <span className="w-10 text-right text-xs font-semibold text-charcoal-700">{v}%</span> : null}
    </div>
  );
};

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
}

export const Tabs = ({ items, value, onChange, className }: { items: TabItem[]; value: string; onChange: (v: string) => void; className?: string }) => (
  <div role="tablist" className={cn('scrollbar-thin flex gap-1 overflow-x-auto rounded-full border border-ivory-300 bg-white p-1', className)}>
    {items.map((t) => (
      <button
        key={t.value}
        role="tab"
        type="button"
        aria-selected={value === t.value}
        onClick={() => onChange(t.value)}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
          value === t.value ? 'bg-rose-600 text-white shadow-sm' : 'text-charcoal-700 hover:bg-ivory-200',
        )}
      >
        {t.label}
        {t.count !== undefined ? <span className={cn('rounded-full px-1.5 text-xs', value === t.value ? 'bg-white/20' : 'bg-ivory-200 text-charcoal-700')}>{t.count}</span> : null}
      </button>
    ))}
  </div>
);

export const ImageWithFallback = ({ className, alt, fallbackLabel, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallbackLabel?: string }) => {
  const [broken, setBroken] = useState(false);
  if (broken || !props.src) {
    return (
      <div className={cn('flex items-center justify-center bg-gradient-to-br from-rose-100 via-ivory-200 to-gold-100', className)} role="img" aria-label={alt}>
        <span className="font-display text-2xl font-semibold text-rose-700/60">{fallbackLabel ?? 'Kanak'}</span>
      </div>
    );
  }
  return <img className={className} alt={alt} loading="lazy" onError={() => setBroken(true)} {...props} />;
};

export const Logo = ({ className, dark, to = '/', compact }: { className?: string; dark?: boolean; to?: string; compact?: boolean }) => (
  <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Kanak Beauty Academy home">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shadow-rose-600/30">
      <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden>
        <path d="M20 16v32M20 32l20-16M20 32l20 16" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
    {!compact ? (
      <span className="leading-none">
        <span className={cn('block font-display text-xl font-bold tracking-tight', dark ? 'text-white' : 'text-charcoal-900')}>Kanak</span>
        <span className={cn('block text-[10px] font-semibold uppercase tracking-[0.22em]', dark ? 'text-gold-300' : 'text-gold-700')}>Beauty Academy</span>
      </span>
    ) : null}
  </Link>
);

export const DashboardStatCard = ({ label, value, icon, hint, tone = 'rose', to }: { label: string; value: ReactNode; icon: ReactNode; hint?: ReactNode; tone?: 'rose' | 'gold' | 'success' | 'info' | 'neutral'; to?: string }) => {
  const tones = {
    rose: 'bg-rose-50 text-rose-600',
    gold: 'bg-gold-50 text-gold-700',
    success: 'bg-emerald-50 text-emerald-600',
    info: 'bg-sky-50 text-sky-600',
    neutral: 'bg-ivory-200 text-charcoal-700',
  };
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-charcoal-500">{label}</p>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>{icon}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-charcoal-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-charcoal-500">{hint}</p> : null}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-5 transition-shadow hover:shadow-lift">
      {content}
    </Link>
  ) : (
    <div className="card p-5">{content}</div>
  );
};

export const DemoBadge = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center rounded-full border border-dashed border-gold-400 bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-800', className)} title="Demo content shown during development">
    Demo
  </span>
);

export const Divider = ({ className }: { className?: string }) => <hr className={cn('border-ivory-200', className)} />;

export const KeyValue = ({ items, className }: { items: Array<{ label: string; value: ReactNode }>; className?: string }) => (
  <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
    {items.map((i) => (
      <div key={i.label}>
        <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">{i.label}</dt>
        <dd className="mt-1 text-sm text-charcoal-800">{i.value}</dd>
      </div>
    ))}
  </dl>
);
