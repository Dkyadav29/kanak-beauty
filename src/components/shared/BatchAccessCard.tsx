import { CalendarDays, Clock, PlayCircle, User, Video } from 'lucide-react';
import { useMyBatches } from '@/hooks/useStudent';
import { formatClassTime, formatDate } from '@/lib/utils';
import type { StudentBatch } from '@/types';
import { StatusBadge, buttonClasses } from '@/components/ui';

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
        <StatusBadge status={batch.status} />
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
        ) : batch.status === 'scheduled' || batch.status === 'active' ? (
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

export const BatchAccessCard = ({ courseId, emptyMessage }: { courseId?: string; emptyMessage?: string }) => {
  const batches = useMyBatches(courseId);
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
