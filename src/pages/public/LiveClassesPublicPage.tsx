import { Link } from 'react-router-dom';
import { CalendarCheck2, Lock } from 'lucide-react';
import { useUpcomingSessions } from '@/hooks/useCatalog';
import { useAuth } from '@/features/auth/AuthContext';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { EmptyState, ErrorState, InlineAlert, LinkButton, LoadingSkeleton, SectionHeading } from '@/components/ui';

const LiveClassesPublicPage = () => {
  const sessions = useUpcomingSessions(20);
  const { isAuthenticated } = useAuth();

  return (
    <div className="container-x py-12 lg:py-16">
      <SectionHeading eyebrow="Live classes" title="Upcoming live class schedule" description="Live sessions are part of our live and hybrid courses. Browse the schedule freely; joining requires a valid enrollment and opens shortly before each class begins." />
      <InlineAlert tone="info" className="mt-6 flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Restricted sessions open only to enrolled students within the join window.{' '}
          {isAuthenticated ? (
            <Link to="/student/live-classes" className="font-semibold underline">
              See my classes
            </Link>
          ) : (
            <>
              <Link to="/login" className="font-semibold underline">
                Log in
              </Link>{' '}
              or{' '}
              <Link to="/courses" className="font-semibold underline">
                enroll in a course
              </Link>{' '}
              to get access.
            </>
          )}
        </span>
      </InlineAlert>
      <div className="mt-8 space-y-4">
        {sessions.isLoading ? (
          <LoadingSkeleton variant="list" count={5} />
        ) : sessions.error ? (
          <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
        ) : sessions.data && sessions.data.length > 0 ? (
          sessions.data.map((s) => (
            <LiveClassCard
              key={s.id}
              session={s}
              action={
                <>
                  <LinkButton to={`/courses/${s.courseId}`} variant="outline" size="sm">
                    View course
                  </LinkButton>
                  <LinkButton to={isAuthenticated ? '/student/live-classes' : '/login'} variant="secondary" size="sm" leftIcon={<CalendarCheck2 className="h-4 w-4" />}>
                    {isAuthenticated ? 'Open in my classes' : 'Login to join'}
                  </LinkButton>
                </>
              }
            />
          ))
        ) : (
          <EmptyState title="No live classes scheduled" description="New batch schedules are announced to enrolled students first." />
        )}
      </div>
    </div>
  );
};

export default LiveClassesPublicPage;
