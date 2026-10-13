import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Radio, Video } from 'lucide-react';
import { useJoinSession, useStudentLiveSessions } from '@/hooks/useStudent';
import { getErrorMessage } from '@/lib/api/errors';
import { formatTime, isToday } from '@/lib/utils';
import type { StudentLiveSession } from '@/types';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { Button, EmptyState, ErrorState, InlineAlert, LoadingSkeleton, PageHeader, Tabs, useToast } from '@/components/ui';

const JoinButton = ({ session }: { session: StudentLiveSession }) => {
  const join = useJoinSession();
  const toast = useToast();
  const navigate = useNavigate();
  const onJoin = async () => {
    try {
      const res = await join.mutateAsync(session.id);
      // The backend returns an absolute URL. Same-origin (built-in room) stays inside the
      // router; an external conferencing provider opens in a new tab.
      const target = new URL(res.joinUrl, window.location.origin);
      if (target.origin === window.location.origin) navigate(`${target.pathname}${target.search}`);
      else window.open(target.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('Unable to join', getErrorMessage(e));
    }
  };
  if (session.status === 'cancelled') return <span className="text-sm text-charcoal-500">This session was cancelled.</span>;
  if (session.status === 'completed') return <span className="text-sm text-charcoal-500">Session ended.</span>;
  if (session.canJoinNow) {
    return (
      <Button onClick={() => void onJoin()} loading={join.isPending} leftIcon={<Video className="h-4 w-4" />}>
        Join Live Class
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-charcoal-500">
      <Clock className="h-4 w-4" /> Join opens at {formatTime(session.joinOpensAt)}
    </span>
  );
};

const StudentLiveClassesPage = () => {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const sessions = useStudentLiveSessions(tab);

  const { today, later } = useMemo(() => {
    const list = sessions.data ?? [];
    return { today: list.filter((s) => isToday(s.startsAt)), later: list.filter((s) => !isToday(s.startsAt)) };
  }, [sessions.data]);

  const renderList = (list: StudentLiveSession[]) => list.map((s) => <LiveClassCard key={s.id} session={s} action={<JoinButton session={s} />} />);

  return (
    <div>
      <PageHeader title="Live Classes" description="Scheduled live sessions for your enrolled courses. The join button activates within each class's join window." />
      <Tabs className="mb-6 w-fit" value={tab} onChange={(v) => setTab(v as 'upcoming' | 'past')} items={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past sessions' }]} />
      {sessions.isLoading ? (
        <LoadingSkeleton variant="list" count={4} />
      ) : sessions.error ? (
        <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
      ) : (sessions.data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Radio className="h-6 w-6" />} title={tab === 'upcoming' ? 'No upcoming live classes' : 'No past sessions yet'} description={tab === 'upcoming' ? 'Live sessions appear here once your batch schedule is published.' : 'Completed sessions and their recordings will be listed here.'} />
      ) : tab === 'upcoming' ? (
        <div className="space-y-8">
          {today.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-2xl font-semibold">Today's classes</h2>
              <div className="space-y-3">{renderList(today)}</div>
            </section>
          ) : null}
          {later.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-2xl font-semibold">Upcoming sessions</h2>
              <div className="space-y-3">{renderList(later)}</div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <InlineAlert tone="info">Attending a past session does not by itself complete a course. Completion follows each course's configured requirements.</InlineAlert>
          <div className="space-y-3">{renderList(sessions.data ?? [])}</div>
        </div>
      )}
    </div>
  );
};

export default StudentLiveClassesPage;
