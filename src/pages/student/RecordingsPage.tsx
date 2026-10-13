import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, PlayCircle, VideoOff } from 'lucide-react';
import { useEnrollments, usePlayback, useRecordings, useUpdateLessonProgress } from '@/hooks/useStudent';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, formatDuration } from '@/lib/utils';
import type { Recording, RecordingPlaybackResponse } from '@/types';
import { Badge, Button, Dialog, EmptyState, ErrorState, InlineAlert, LoadingSkeleton, PageHeader, SearchAndFilters, StatusBadge, useToast } from '@/components/ui';

const Player = ({ recording, playback, onClose }: { recording: Recording; playback: RecordingPlaybackResponse; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const update = useUpdateLessonProgress(recording.courseId);
  const toast = useToast();
  const lastSaved = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (v && playback.resumePositionSeconds > 0) v.currentTime = playback.resumePositionSeconds;
  }, [playback.resumePositionSeconds]);

  const savePosition = (seconds: number, completed?: boolean) => {
    if (!recording.lessonId) return;
    update.mutate({ lessonId: recording.lessonId, payload: { lastPositionSeconds: Math.floor(seconds), ...(completed ? { completed: true } : {}) } });
  };

  return (
    <Dialog open onClose={onClose} title={recording.title} description={`${recording.courseTitle} · ${recording.trainerName} · recorded ${formatDate(recording.recordedAt)}`} size="xl">
      <video
        ref={videoRef}
        src={playback.streamUrl}
        controls
        className="aspect-video w-full rounded-xl bg-charcoal-900"
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (t - lastSaved.current > 15) {
            lastSaved.current = t;
            savePosition(t);
          }
        }}
        onPause={(e) => savePosition(e.currentTarget.currentTime)}
        onEnded={(e) => {
          savePosition(e.currentTarget.duration, true);
          if (recording.lessonId) toast.success('Lesson marked complete');
        }}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-charcoal-500">
        <p>
          Playback resumes where you left off. Stream link expires {new Date(playback.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.
        </p>
        {recording.lessonId ? (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            loading={update.isPending}
            onClick={() => {
              savePosition(videoRef.current?.currentTime ?? 0, true);
              toast.success('Lesson marked complete');
            }}
          >
            Mark lesson complete
          </Button>
        ) : (
          <Badge tone="neutral">Not linked to a lesson</Badge>
        )}
      </div>
    </Dialog>
  );
};

const RecordingsPage = () => {
  const [filters, setFilters] = useState<Record<string, string>>({ courseId: 'all', from: '', to: '' });
  const query = useMemo(
    () => ({ courseId: filters.courseId !== 'all' ? filters.courseId : undefined, from: filters.from || undefined, to: filters.to || undefined }),
    [filters],
  );
  const recordings = useRecordings(query);
  const enrollments = useEnrollments();
  const playback = usePlayback();
  const toast = useToast();
  const [active, setActive] = useState<{ recording: Recording; playback: RecordingPlaybackResponse } | null>(null);

  const open = async (r: Recording) => {
    try {
      const res = await playback.mutateAsync(r.id);
      setActive({ recording: r, playback: res });
    } catch (e) {
      toast.error('Cannot play recording', getErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Past & Recorded Classes" description="Watch recordings of your past live sessions where available. Playback resumes automatically and linked lessons are tracked." />
      <SearchAndFilters
        filters={[
          { key: 'courseId', label: 'Course', options: (enrollments.data ?? []).map((e) => ({ value: e.courseId, label: e.title })) },
          { key: 'from', label: 'From', type: 'date' },
          { key: 'to', label: 'To', type: 'date' },
        ]}
        values={filters}
        onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ courseId: 'all', from: '', to: '' })}
      />
      <div className="mt-6">
        {recordings.isLoading ? (
          <LoadingSkeleton variant="list" count={4} />
        ) : recordings.error ? (
          <ErrorState error={recordings.error} onRetry={() => void recordings.refetch()} />
        ) : (recordings.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<VideoOff className="h-6 w-6" />} title="No recordings yet" description="Recordings appear here after your live sessions are processed." />
        ) : (
          <div className="space-y-3">
            <InlineAlert tone="info">A past session is not the same as course completion. Progress is tracked per lesson in each course.</InlineAlert>
            {recordings.data!.map((r) => (
              <article key={r.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <button type="button" onClick={() => r.status === 'available' && void open(r)} disabled={r.status !== 'available'} className="relative flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-charcoal-900 text-white sm:w-44 disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Play ${r.title}`}>
                  <PlayCircle className="h-10 w-10" />
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold">{formatDuration(r.durationMinutes)}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.lessonId ? <Badge tone="gold">Linked lesson</Badge> : null}
                  </div>
                  <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug">{r.title}</h3>
                  <p className="text-sm text-charcoal-500">
                    {r.courseTitle} · {r.trainerName}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500">
                    <Clock className="h-3.5 w-3.5" /> Recorded {formatDate(r.recordedAt)}
                  </p>
                </div>
                <div className="sm:w-40">
                  {r.status === 'available' ? (
                    <Button className="w-full" onClick={() => void open(r)} loading={playback.isPending && playback.variables === r.id} leftIcon={<PlayCircle className="h-4 w-4" />}>
                      Watch
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-charcoal-500">{r.status === 'processing' ? 'Recording is being processed.' : 'Recording unavailable for this session.'}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {active ? <Player recording={active.recording} playback={active.playback} onClose={() => setActive(null)} /> : null}
    </div>
  );
};

export default RecordingsPage;
