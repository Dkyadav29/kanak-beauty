import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCourses } from '@/hooks/useCatalog';
import type { CourseFilters } from '@/types';
import { CourseCard } from '@/components/shared/CourseCard';
import { EmptyState, ErrorState, LoadingSkeleton, SearchAndFilters, SectionHeading } from '@/components/ui';

const CoursesPage = () => {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const level = (params.get('level') ?? 'all') as CourseFilters['level'];
  const format = (params.get('format') ?? 'all') as CourseFilters['format'];

  const filters = useMemo(() => ({ search: search || undefined, level, format }), [search, level, format]);
  const courses = useCourses(filters);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="container-x py-12 lg:py-16">
      <SectionHeading eyebrow="Course catalogue" title="Explore our professional beauty courses" description="Browse every published programme. Open a course to see its curriculum, schedule, trainer and enrollment details." />
      <div className="mt-8">
        <SearchAndFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search courses or trainers…"
          filters={[
            { key: 'level', label: 'Level', options: [{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }] },
            { key: 'format', label: 'Format', options: [{ value: 'live', label: 'Live' }, { value: 'recorded', label: 'Recorded' }, { value: 'hybrid', label: 'Hybrid' }] },
          ]}
          values={{ level: level ?? 'all', format: format ?? 'all' }}
          onFilterChange={setFilter}
          onReset={() => {
            setSearch('');
            setParams({}, { replace: true });
          }}
        />
      </div>
      <div className="mt-8">
        {courses.isLoading ? (
          <LoadingSkeleton variant="cards" count={6} />
        ) : courses.error ? (
          <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
        ) : courses.data && courses.data.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-charcoal-500">{courses.data.length} course{courses.data.length === 1 ? '' : 's'} found</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.data.map((c, i) => (
                <CourseCard key={c.id} course={c} index={i} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="No courses match your filters" description="Try a different search term or clear the filters." />
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
