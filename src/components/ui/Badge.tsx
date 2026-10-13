import type { ReactNode } from 'react';
import { cn, titleCase } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'rose' | 'gold' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-ivory-200 text-charcoal-700 border-ivory-300',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  gold: 'bg-gold-50 text-gold-800 border-gold-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-sky-50 text-sky-700 border-sky-100',
};

export const Badge = ({ tone = 'neutral', className, children, dot }: { tone?: BadgeTone; className?: string; children: ReactNode; dot?: boolean }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
    {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
    {children}
  </span>
);

const statusTone: Record<string, BadgeTone> = {
  // generic
  active: 'success',
  published: 'success',
  paid: 'success',
  issued: 'success',
  completed: 'success',
  present: 'success',
  available: 'success',
  verified: 'success',
  live: 'rose',
  scheduled: 'info',
  upcoming: 'info',
  in_progress: 'info',
  enrolled: 'info',
  processing: 'info',
  pending: 'warning',
  pending_payment: 'warning',
  late: 'warning',
  draft: 'neutral',
  unpublished: 'neutral',
  archived: 'neutral',
  unavailable: 'neutral',
  none: 'neutral',
  suspended: 'warning',
  requested: 'warning',
  withdrawn: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  refunded: 'danger',
  revoked: 'danger',
  absent: 'danger',
  not_found: 'danger',
  // levels / formats
  beginner: 'success',
  intermediate: 'gold',
  advanced: 'rose',
  recorded: 'neutral',
  hybrid: 'gold',
  purchase: 'neutral',
  admin_grant: 'gold',
  automatic: 'info',
  manual_approval: 'gold',
};

export const StatusBadge = ({ status, className, label }: { status: string; className?: string; label?: string }) => (
  <Badge tone={statusTone[status] ?? 'neutral'} className={className} dot>
    {label ?? titleCase(status)}
  </Badge>
);
