import type { ReactNode } from 'react';
import { CalendarDays, Clock, UserRound, Video } from 'lucide-react';
import type { LiveSession, StudentLiveSession } from '@/types';
import { cn, formatDate, formatDuration, formatTime, isToday } from '@/lib/utils';
import { Badge, StatusBadge } from '@/components/ui';

const isStudentSession = (s: LiveSession | StudentLiveSession): s is StudentLiveSession => 'canJoinNow' in s;

export const LiveClassCard = ({ session, action, compact, className }: { session: LiveSession | StudentLiveSession; action?: ReactNode; compact?: boolean; className?: string }) => {
  const today = isToday(session.startsAt);
  const date = new Date(session.startsAt);
  const student = isStudentSession(session) ? session : null;
  return (
    <article className={cn('card flex gap-4 p-4 sm:p-5', className)}>
      <div className={cn('flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl border text-center', today ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-ivory-300 bg-ivory-100 text-charcoal-800')}>
        <span className="text-[10px] font-semibold uppercase tracking-wider">{date.toLocaleString('en-IN', { month: 'short' })}</span>
        <span className="font-display text-2xl font-semibold leading-none">{date.getDate()}</span>
        <span className="text-[10px] font-medium">{date.toLocaleString('en-IN', { weekday: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {today && session.status !== 'cancelled' ? (
            <Badge tone="rose" dot>
              Today
            </Badge>
          ) : null}
          <StatusBadge status={session.status === 'scheduled' ? 'upcoming' : session.status} />
          {student && !student.isEnrolled ? <Badge tone="gold">Login & enroll to join</Badge> : null}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-charcoal-900 sm:text-xl">{session.title}</h3>
        <p className="text-sm text-charcoal-500">{session.courseTitle}</p>
        {!compact ? <p className="mt-1.5 line-clamp-2 text-sm text-charcoal-700">{session.description}</p> : null}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-charcoal-700">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-rose-600" /> {formatDate(session.startsAt)} · {formatTime(session.startsAt)}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-rose-600" /> {formatDuration(session.durationMinutes)}
          </li>
          <li className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-rose-600" /> {session.trainerName}
          </li>
          <li className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-rose-600" /> Live class
          </li>
        </ul>
        {action ? <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </article>
  );
};
