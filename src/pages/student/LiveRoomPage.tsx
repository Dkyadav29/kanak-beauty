import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, MonitorPlay, ShieldCheck, Video } from 'lucide-react';
import { useStudentLiveSessions } from '@/hooks/useStudent';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { ErrorState, InlineAlert, KeyValue, LinkButton, LoadingSkeleton } from '@/components/ui';
import { ForbiddenPage } from '@/pages/ErrorPages';

/**
 * Built-in classroom used when the backend runs LIVE_PROVIDER=internal. The join
 * endpoint returns a URL to this route carrying a short-lived signed ticket bound
 * to the session and student. With an external provider (Zoom, Google Meet, etc.)
 * the join URL points at the provider instead and this route is not used.
 */
const LiveRoomPage = () => {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const ticket = params.get('ticket');
  const sessions = useStudentLiveSessions('all');

  if (sessions.isLoading) return <LoadingSkeleton variant="page" />;
  if (sessions.error) return <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />;
  const session = sessions.data?.find((s) => s.id === sessionId);
  if (!session || !session.isEnrolled || !ticket) return <ForbiddenPage />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/student/live-classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-rose-700">
        <ArrowLeft className="h-4 w-4" /> Back to live classes
      </Link>
      <div className="card overflow-hidden">
        <div className="relative aspect-video bg-charcoal-900 text-white">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/90">
              <Video className="h-8 w-8" />
            </span>
            <p className="font-display text-2xl font-semibold">{session.title}</p>
            <p className="text-sm text-white/70">Kanak classroom · built-in room</p>
            <div className="mt-4 flex gap-2">
              {[Mic, Video, MonitorPlay].map((Icon, i) => (
                <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
        </div>
        <div className="p-6">
          <InlineAlert tone="info" className="mb-5 flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your access was verified by the backend (enrollment and join window). When an external conferencing provider is configured, the join button opens its signed meeting link instead; no meeting credentials are ever embedded in the frontend.</span>
          </InlineAlert>
          <KeyValue
            items={[
              { label: 'Course', value: session.courseTitle },
              { label: 'Trainer', value: session.trainerName },
              { label: 'Starts', value: formatDateTime(session.startsAt) },
              { label: 'Duration', value: formatDuration(session.durationMinutes) },
              { label: 'Join window closes', value: formatDateTime(session.joinClosesAt) },
              { label: 'Join ticket', value: <span className="font-mono text-xs">{ticket}</span> },
            ]}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <LinkButton to="/student/live-classes" variant="outline">
              Leave class
            </LinkButton>
            <LinkButton to={`/student/courses/${session.courseId}/learn`} variant="secondary">
              Open course materials
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRoomPage;
