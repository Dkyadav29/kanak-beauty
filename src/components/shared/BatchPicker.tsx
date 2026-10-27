import { useState } from 'react';
import { BellRing, CalendarDays, CheckCircle2, Clock, MonitorPlay, UserRound, Users } from 'lucide-react';
import type { PublicBatch } from '@/types';
import { useBatchInterest } from '@/hooks/useCatalog';
import { getErrorMessage } from '@/lib/api/errors';
import { cn, formatClassTime, formatDate, titleCase } from '@/lib/utils';
import { Badge, Button, InlineAlert, Input } from '@/components/ui';

const CLOSED_LABEL: Record<NonNullable<PublicBatch['closedReason']>, string> = {
  full: 'Batch full',
  deadline_passed: 'Enrollment closed',
  started: 'Already started',
  closed: 'Not open',
};

/** Upcoming batches as selectable cards. Closed/full ones are shown but cannot be chosen. */
export const BatchPicker = ({ batches, value, onChange }: { batches: PublicBatch[]; value: string | null; onChange: (id: string) => void }) => (
  <div className="space-y-2" role="radiogroup" aria-label="Choose your batch">
    {batches.map((b) => {
      const selected = value === b.id;
      const time = formatClassTime(b.startTime, b.endTime);
      return (
        <label
          key={b.id}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 transition-colors',
            !b.isOpen ? 'cursor-not-allowed border-ivory-300 bg-ivory-100/60 opacity-70' : selected ? 'cursor-pointer border-rose-400 bg-rose-50/60' : 'cursor-pointer border-ivory-300 hover:border-rose-200',
          )}
        >
          <input type="radio" name="batch" className="mt-1 h-4 w-4 accent-rose-600" checked={selected} disabled={!b.isOpen} onChange={() => onChange(b.id)} />
          <span className="min-w-0 flex-1 text-sm">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-charcoal-900">{b.name}</span>
              {b.isOpen ? (
                <Badge tone={b.seatsLeft <= 3 ? 'warning' : 'success'}>{b.seatsLeft} seat{b.seatsLeft === 1 ? '' : 's'} left</Badge>
              ) : (
                <Badge tone="neutral">{CLOSED_LABEL[b.closedReason ?? 'closed']}</Badge>
              )}
            </span>
            <span className="mt-1.5 grid gap-x-4 gap-y-1 text-charcoal-700 sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-rose-600" /> {formatDate(b.startDate)} – {formatDate(b.endDate)}
              </span>
              {time ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-rose-600" /> {time}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <MonitorPlay className="h-3.5 w-3.5 text-rose-600" /> {titleCase(b.deliveryMode)}
              </span>
              {b.trainerName ? (
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-rose-600" /> {b.trainerName}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-rose-600" /> Enroll by {formatDate(b.enrollmentDeadline)}
              </span>
            </span>
            {b.scheduleNote ? <span className="mt-1 block text-xs text-charcoal-500">{b.scheduleNote}</span> : null}
          </span>
        </label>
      );
    })}
  </div>
);

/** Shown when a batch-taught course has no open batch: lets the visitor ask to be notified. */
export const NoBatchNotice = ({ courseIdOrSlug, email }: { courseIdOrSlug: string; email?: string }) => {
  const notify = useBatchInterest();
  const [address, setAddress] = useState(email ?? '');
  const [error, setError] = useState<string | null>(null);
  if (notify.isSuccess) {
    return (
      <InlineAlert tone="success" className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" /> Thanks! We will email you as soon as a new batch opens.
      </InlineAlert>
    );
  }
  return (
    <div className="rounded-xl border border-ivory-300 bg-ivory-100 p-4 text-sm">
      <p className="font-semibold text-charcoal-900">No upcoming batch is open for enrollment right now.</p>
      <p className="mt-1 text-charcoal-700">Leave your email and we will let you know when the next batch opens.</p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          notify.mutate({ idOrSlug: courseIdOrSlug, email: address.trim() || undefined }, { onError: (err) => setError(getErrorMessage(err)) });
        }}
      >
        <Input type="email" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" aria-label="Email" disabled={!!email} />
        <Button type="submit" loading={notify.isPending} leftIcon={<BellRing className="h-4 w-4" />}>
          Notify me
        </Button>
      </form>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
};
