import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useEnrollments } from '@/hooks/useStudent';
import { CourseProgressCard } from '@/components/shared/CourseProgressCard';
import { EmptyState, ErrorState, LinkButton, LoadingSkeleton, PageHeader, Tabs } from '@/components/ui';

type Filter = 'all' | 'in_progress' | 'live' | 'recorded' | 'completed';

const MyCoursesPage = () => {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') as Filter) || 'all';
  const enrollments = useEnrollments();

  const groups = useMemo(() => {
    const all = enrollments.data ?? [];
    return {
      all,
      in_progress: all.filter((c) => !c.isCompleted && c.enrollment.accessStatus === 'active'),
      live: all.filter((c) => c.format === 'live' || c.format === 'hybrid'),
      recorded: all.filter((c) => c.format === 'recorded' || c.format === 'hybrid'),
      completed: all.filter((c) => c.isCompleted),
    };
  }, [enrollments.data]);

  const visible = groups[filter] ?? groups.all;

  return (
    <div>
      <PageHeader title="My Courses" description="Every course you have access to, with your progress and next steps." actions={<LinkButton to="/courses" variant="outline" leftIcon={<BookOpen className="h-4 w-4" />}>Browse catalogue</LinkButton>} />
      <Tabs
        className="mb-6 w-fit max-w-full"
        value={filter}
        onChange={(v) => setParams(v === 'all' ? {} : { filter: v }, { replace: true })}
        items={[
          { value: 'all', label: 'All Courses', count: groups.all.length },
          { value: 'in_progress', label: 'In Progress', count: groups.in_progress.length },
          { value: 'live', label: 'Live Courses', count: groups.live.length },
          { value: 'recorded', label: 'Recorded Courses', count: groups.recorded.length },
          { value: 'completed', label: 'Completed', count: groups.completed.length },
        ]}
      />
      {enrollments.isLoading ? (
        <LoadingSkeleton variant="cards" count={3} />
      ) : enrollments.error ? (
        <ErrorState error={enrollments.error} onRetry={() => void enrollments.refetch()} />
      ) : visible.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <CourseProgressCard key={c.enrollment.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState title={filter === 'all' ? 'You are not enrolled in any course yet' : 'No courses in this view'} description={filter === 'all' ? 'Explore the catalogue and enroll to start learning.' : 'Try another filter.'} action={filter === 'all' ? <LinkButton to="/courses">Explore courses</LinkButton> : undefined} />
      )}
    </div>
  );
};

export default MyCoursesPage;
