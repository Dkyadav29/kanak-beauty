import { useCallback, useMemo, useState } from 'react';
import { Clock3, Eye, EyeOff, Layers, Pencil, Plus } from 'lucide-react';
import { useAdminCourses, useCourseMutations } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { CourseSummary } from '@/types';
import { Badge, Button, ConfirmationDialog, EmptyState, ErrorState, ImageWithFallback, LinkButton, LoadingSkeleton, PageHeader, SearchAndFilters, StatusBadge, useToast } from '@/components/ui';

type PendingAction = { course: CourseSummary; action: 'publish' | 'unpublish' } | null;

const AdminCoursesPage = () => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const query = useMemo(() => ({ search: search || undefined, status: filters.status && filters.status !== 'all' ? filters.status : undefined }), [search, filters]);
  const courses = useAdminCourses(query);
  const { publish, unpublish } = useCourseMutations();
  const [pending, setPending] = useState<PendingAction>(null);
  const onSearch = useCallback((v: string) => setSearch(v), []);

  const confirm = async () => {
    if (!pending) return;
    try {
      if (pending.action === 'publish') {
        await publish.mutateAsync(pending.course.id);
        toast.success('Course published', `"${pending.course.title}" is now visible in the public catalogue.`);
      } else {
        await unpublish.mutateAsync(pending.course.id);
        toast.success('Course unpublished', `"${pending.course.title}" is hidden from the catalogue. Enrolled students keep access.`);
      }
      setPending(null);
    } catch (e) {
      toast.error(pending.action === 'publish' ? 'Could not publish' : 'Could not unpublish', getErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Create and maintain the academy's programmes. Draft courses are invisible to students; publishing requires at least one lesson."
        actions={
          <LinkButton to="/admin/courses/new" leftIcon={<Plus className="h-4 w-4" />}>
            New course
          </LinkButton>
        }
      />
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search courses or trainers…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'unpublished', label: 'Unpublished' },
            ],
          },
        ]}
        values={filters}
        onFilterChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => {
          setSearch('');
          setFilters({ status: 'all' });
        }}
        className="mb-6"
      />

      {courses.isLoading ? (
        <LoadingSkeleton variant="cards" count={6} />
      ) : courses.error ? (
        <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
      ) : courses.data && courses.data.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-charcoal-500">
            {courses.data.length} course{courses.data.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {courses.data.map((c) => (
              <article key={c.id} className="card flex flex-col overflow-hidden">
                <div className="relative">
                  <ImageWithFallback src={c.thumbnailUrl} alt={c.title} className="aspect-[16/10] w-full object-cover" fallbackLabel={c.title.split(' ')[0]} />
                  <StatusBadge status={c.status} className="absolute left-3 top-3 shadow-sm" />
                  {c.featured ? (
                    <Badge tone="gold" className="absolute right-3 top-3 shadow-sm">
                      Featured
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold leading-snug text-charcoal-900">{c.title}</h3>
                  <p className="mt-1 text-sm text-charcoal-500">with {c.trainer.name}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <StatusBadge status={c.level} />
                    <StatusBadge status={c.format} />
                    {c.certificateEnabled ? <Badge tone="rose">Certificate</Badge> : null}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-charcoal-500">Price</dt>
                      <dd className="font-semibold text-charcoal-900">
                        {formatCurrency(c.discountPrice ?? c.price, c.currency)}
                        {c.discountPrice !== null ? <span className="ml-1.5 text-xs font-normal text-charcoal-500 line-through">{formatCurrency(c.price, c.currency)}</span> : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-charcoal-500">Curriculum</dt>
                      <dd className="flex items-center gap-1 text-charcoal-800">
                        <Layers className="h-3.5 w-3.5 text-charcoal-500" /> {c.moduleCount} modules · {c.lessonCount} lessons
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 flex items-center gap-1 text-xs text-charcoal-500">
                    <Clock3 className="h-3.5 w-3.5" /> Updated {formatDate(c.updatedAt)}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <LinkButton to={`/admin/courses/${c.id}`} variant="outline" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />}>
                      Edit
                    </LinkButton>
                    {c.status === 'published' ? (
                      <Button variant="ghost" size="sm" onClick={() => setPending({ course: c, action: 'unpublish' })} leftIcon={<EyeOff className="h-3.5 w-3.5" />}>
                        Unpublish
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => setPending({ course: c, action: 'publish' })} leftIcon={<Eye className="h-3.5 w-3.5" />} disabled={c.lessonCount === 0} title={c.lessonCount === 0 ? 'Add at least one lesson before publishing' : undefined}>
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="No courses match"
          description={search || filters.status !== 'all' ? 'Try a different search or clear the filters.' : 'Create your first course to start building the catalogue.'}
          action={
            <LinkButton to="/admin/courses/new" leftIcon={<Plus className="h-4 w-4" />}>
              New course
            </LinkButton>
          }
        />
      )}

      <ConfirmationDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        loading={publish.isPending || unpublish.isPending}
        title={pending?.action === 'publish' ? 'Publish this course?' : 'Unpublish this course?'}
        description={
          pending?.action === 'publish'
            ? `"${pending.course.title}" will appear in the public catalogue and become purchasable.`
            : `"${pending?.course.title}" will be hidden from the catalogue and new purchases. Students already enrolled keep their access.`
        }
        confirmLabel={pending?.action === 'publish' ? 'Publish' : 'Unpublish'}
      />
    </div>
  );
};

export default AdminCoursesPage;
