import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAdminBatches, useAdminCourses, useAdminTrainers, useBatchMutations } from '@/hooks/useAdmin';
import { formatDate, percent } from '@/lib/utils';
import type { BatchFilters, BatchSummary } from '@/types';
import { PermissionGate } from '@/components/auth/guards';
import { Button, DataTable, PageHeader, ProgressBar, SearchAndFilters, StatusBadge, useToast, type Column } from '@/components/ui';
import { BatchFormDialog } from './shared/BatchFormDialog';

const PAGE_SIZE = 10;
const clean = (v?: string) => (v && v !== 'all' ? v : undefined);

const AdminBatchesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const courses = useAdminCourses();
  const trainers = useAdminTrainers();
  const { create } = useBatchMutations();

  const query = useMemo(
    () => ({ search: search || undefined, courseId: clean(filters.courseId), trainerId: clean(filters.trainerId), status: clean(filters.status) as BatchFilters['status'], page, pageSize: PAGE_SIZE }),
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
    {
      key: 'batch',
      header: 'Batch',
      render: (b) => (
        <div>
          <p className="font-mono text-xs text-charcoal-500">{b.code}</p>
          <p className="font-medium text-charcoal-900">{b.name}</p>
        </div>
      ),
    },
    { key: 'course', header: 'Course', render: (b) => b.courseTitle, hideBelow: 'md' },
    { key: 'trainer', header: 'Trainer', render: (b) => b.trainerName, hideBelow: 'lg' },
    {
      key: 'dates',
      header: 'Dates',
      render: (b) => (
        <span className="whitespace-nowrap text-charcoal-700">
          {formatDate(b.startDate)} – {formatDate(b.endDate)}
        </span>
      ),
      hideBelow: 'sm',
    },
    {
      key: 'capacity',
      header: 'Seats',
      render: (b) => (
        <div className="min-w-[120px]">
          <p className="text-xs text-charcoal-700">
            <span className="font-semibold">{b.totalStudents}</span> / {b.capacity}
          </p>
          <ProgressBar value={percent(b.totalStudents, b.capacity)} size="sm" tone={b.totalStudents >= b.capacity ? 'gold' : 'rose'} className="mt-1" />
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Cohorts of enrolled students with a trainer, schedule and capacity. Open a batch to manage students, sessions and status."
        actions={
          <PermissionGate permission="batches:manage">
            <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Create batch
            </Button>
          </PermissionGate>
        }
      />
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by batch name or code…"
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
        emptyTitle="No batches found"
        emptyDescription="Create a batch to group enrolled students under a trainer and schedule."
        emptyAction={
          <PermissionGate permission="batches:manage">
            <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
              Create batch
            </Button>
          </PermissionGate>
        }
        pagination={batches.data ? { page, pageSize: PAGE_SIZE, total: batches.data.total, onPageChange: setPage } : undefined}
        caption="Batches"
      />

      <BatchFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Create batch"
        submitLabel="Create batch"
        onSubmit={async (payload) => {
          const b = await create.mutateAsync(payload);
          toast.success('Batch created', `${b.code} · ${b.name} is scheduled.`);
          navigate(`/admin/batches/${b.id}`);
        }}
      />
    </div>
  );
};

export default AdminBatchesPage;
