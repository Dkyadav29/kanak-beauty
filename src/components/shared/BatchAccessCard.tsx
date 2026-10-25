import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, PlayCircle, User, Video } from 'lucide-react';
import { useMyBatches } from '@/hooks/useStudent';
import { formatClassTime, formatDate } from '@/lib/utils';
import type { StudentBatch, StudentBatchPhase } from '@/types';
import { Badge, EmptyState, LinkButton, buttonClasses } from '@/components/ui';

const PHASE_BADGE: Record<StudentBatchPhase, { tone: 'info' | 'success' | 'neutral'; label: string }> = {
  upcoming: { tone: 'info', label: 'Upcoming' },
  live: { tone: 'success', label: 'Live now' },
  completed: { tone: 'neutral', label: 'Completed' },
};

export const BatchPhaseBadge = ({ phase }: { phase: StudentBatchPhase }) => (
  <Badge tone={PHASE_BADGE[phase].tone} dot>
    {PHASE_BADGE[phase].label}
  </Badge>
);

/**
 * Schedule plus the Google Meet / recording links for the student's batches.
 * The links come only from GET /student/batches, which the backend restricts to
 * verified (paid or admin-granted) batch members; nothing here decides access.
 */
const BatchRow = ({ batch, showCourse }: { batch: StudentBatch; showCourse: boolean }) => {
  const classTime = formatClassTime(batch.startTime, batch.endTime);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{showCourse ? batch.courseTitle : 'Your batch'}</p>
          <h3 className="mt-0.5 font-display text-xl font-semibold">
            {batch.name} <span className="font-mono text-sm font-normal text-charcoal-500">{batch.code}</span>
          </h3>
        </div>
        <BatchPhaseBadge phase={batch.phase} />
      </div>
      <ul className="mt-3 grid gap-1.5 text-sm text-charcoal-700 sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-charcoal-400" /> {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
        </li>
        {classTime ? (
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-charcoal-400" /> {classTime}
          </li>
        ) : null}
        {batch.trainerName ? (
          <li className="flex items-center gap-2">
            <User className="h-4 w-4 text-charcoal-400" /> {batch.trainerName}
          </li>
        ) : null}
        {batch.scheduleNote ? <li className="text-charcoal-500 sm:col-span-2">{batch.scheduleNote}</li> : null}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {batch.meetLink ? (
          <a href={batch.meetLink} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'md', 'gap-2')}>
            <Video className="h-4 w-4" /> Join Google Meet
          </a>
        ) : batch.phase !== 'completed' ? (
          <span className="text-sm text-charcoal-500">The live-class link will appear here once your trainer adds it.</span>
        ) : null}
        {batch.recordingLink ? (
          <a href={batch.recordingLink} target="_blank" rel="noopener noreferrer" className={buttonClasses('outline', 'md', 'gap-2')}>
            <PlayCircle className="h-4 w-4" /> Watch recording
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-charcoal-500">These links are for you only. Please don't share them.</p>
    </div>
  );
};

export const BatchAccessCard = ({ courseId, emptyMessage, phase }: { courseId?: string; emptyMessage?: string; phase?: StudentBatchPhase | 'current' }) => {
  const batches = useMyBatches(courseId, phase);
  if (batches.isLoading || batches.error) return null;
  const list = batches.data ?? [];
  if (list.length === 0) {
    return emptyMessage ? <div className="card p-5 text-sm text-charcoal-600">{emptyMessage}</div> : null;
  }
  return (
    <div className="space-y-3">
      {list.map((b) => (
        <BatchRow key={b.id} batch={b} showCourse={!courseId} />
      ))}
    </div>
  );
};

/** One finished batch: course, dates and the recording if there is one. */
const CompletedBatchRow = ({ batch }: { batch: StudentBatch }) => (
  <li className="flex flex-wrap items-center gap-3 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
      <CheckCircle2 className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <Link to={`/student/courses/${batch.courseId}/learn`} className="block truncate text-sm font-semibold hover:text-rose-700">
        {batch.courseTitle}
      </Link>
      <p className="text-xs text-charcoal-500">
        {batch.name} · {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
        {batch.courseCompleted ? ' · Course completed' : ''}
      </p>
    </div>
    {batch.recordingLink ? (
      <a href={batch.recordingLink} target="_blank" rel="noopener noreferrer" className={buttonClasses('outline', 'sm', 'gap-1.5')}>
        <PlayCircle className="h-4 w-4" /> Recording
      </a>
    ) : null}
  </li>
);

/**
 * The student's batches for the dashboard and profile: upcoming and live batches as full
 * cards (with the class link), finished ones in a compact "Completed" list. Only batches of
 * courses the student actually bought (or was granted) are returned by the API, so a student
 * without a purchase sees the empty state.
 */
export const MyBatchesSection = ({ title = 'My batches' }: { title?: string }) => {
  const batches = useMyBatches();
  if (batches.isLoading || batches.error) return null;
  const list = batches.data ?? [];
  const current = list
    .filter((b) => b.phase !== 'completed')
    // Live first, then the soonest upcoming.
    .sort((a, b) => (a.phase === b.phase ? a.startDate.localeCompare(b.startDate) : a.phase === 'live' ? -1 : 1));
  const completed = list.filter((b) => b.phase === 'completed');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {current.length > 0 ? (
          <Link to="/student/live-classes" className="text-sm font-semibold text-rose-700 hover:underline">
            Live classes
          </Link>
        ) : null}
      </div>
      {current.length > 0 ? (
        <div className="space-y-3">
          {current.map((b) => (
            <BatchRow key={b.id} batch={b} showCourse />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No upcoming or live batches"
          description={completed.length > 0 ? 'All your batches are finished. Enroll in a new course to join its next batch.' : 'Buy a course and you are placed in its next batch automatically. It will show up here.'}
          action={<LinkButton to="/courses" size="sm">Browse courses</LinkButton>}
          compact
        />
      )}
      {completed.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Completed ({completed.length})</h3>
          <ul className="card divide-y divide-ivory-200">
            {completed.map((b) => (
              <CompletedBatchRow key={b.id} batch={b} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
