import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminBatches, useAdminCourses, useAdminTrainers } from '@/hooks/useAdmin';
import { formatDate } from '@/lib/utils';
import type { BatchFilters, BatchSummary } from '@/types';
import { DataTable, InlineAlert, PageHeader, SearchAndFilters, StatusBadge, type Column } from '@/components/ui';

const PAGE_SIZE = 10;
const clean = (v?: string) => (v && v !== 'all' ? v : undefined);

const AdminBatchHistoryPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const courses = useAdminCourses();
  const trainers = useAdminTrainers();

  const query = useMemo(
    () => ({
      search: search || undefined,
      courseId: clean(filters.courseId),
      trainerId: clean(filters.trainerId),
      status: clean(filters.status) as BatchFilters['status'],
      startFrom: filters.startFrom || undefined,
      startTo: filters.startTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, filters, page],
  );
  const batches = useAdminBatches(query);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const columns: Column<BatchSummary>[] = [
    { key: 'code', header: 'Batch ID', render: (b) => <span className="font-mono text-xs">{b.code}</span> },
    { key: 'name', header: 'Name', render: (b) => <span className="font-medium text-charcoal-900">{b.name}</span> },
    { key: 'course', header: 'Course', render: (b) => b.courseTitle, hideBelow: 'md' },
    { key: 'trainer', header: 'Trainer', render: (b) => b.trainerName, hideBelow: 'lg' },
    { key: 'enrolled', header: 'Enrolled', render: (b) => b.totalStudents, align: 'center' },
    { key: 'completed', header: 'Completed', render: (b) => b.completedStudents, align: 'center', hideBelow: 'sm' },
    { key: 'inProgress', header: 'In progress', render: (b) => b.inProgressStudents, align: 'center', hideBelow: 'md' },
    { key: 'withdrawn', header: 'Withdrawn', render: (b) => b.withdrawnStudents, align: 'center', hideBelow: 'lg' },
    { key: 'start', header: 'Start', render: (b) => <span className="whitespace-nowrap">{formatDate(b.startDate)}</span>, hideBelow: 'sm' },
    { key: 'end', header: 'End', render: (b) => <span className="whitespace-nowrap">{formatDate(b.endDate)}</span>, hideBelow: 'xl' },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Batch history" description="Every batch ever run, including completed, cancelled and archived cohorts, with enrollment and completion counts." />
      <InlineAlert tone="info" className="mb-4">
        Historical records are preserved after a batch is completed or archived. Archived batches are read-only but remain fully searchable here.
      </InlineAlert>
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by batch name, code or ID…"
        filters={[
          { key: 'courseId', label: 'Course', options: courses.data?.map((c) => ({ value: c.id, label: c.title })) ?? [] },
          { key: 'trainerId', label: 'Trainer', options: trainers.data?.map((t) => ({ value: t.id, label: t.name })) ?? [] },
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'archived', label: 'Archived' },
            ],
          },
          { key: 'startFrom', label: 'Start from', type: 'date' },
          { key: 'startTo', label: 'Start to', type: 'date' },
        ]}
        values={filters}
        onFilterChange={onFilter}
        onReset={() => {
          setSearch('');
          setFilters({});
          setPage(1);
        }}
        className="mb-4"
      />
      <DataTable
        columns={columns}
        rows={batches.data?.items}
        rowKey={(b) => b.id}
        isLoading={batches.isLoading || batches.isFetching}
        error={batches.error}
        onRetry={() => void batches.refetch()}
        onRowClick={(b) => navigate(`/admin/batches/${b.id}`)}
        emptyTitle="No batches match"
        emptyDescription="Adjust the filters or date range to find historical batches."
        pagination={batches.data ? { page, pageSize: PAGE_SIZE, total: batches.data.total, onPageChange: setPage } : undefined}
        caption="Batch history"
      />
    </div>
  );
};

export default AdminBatchHistoryPage;
