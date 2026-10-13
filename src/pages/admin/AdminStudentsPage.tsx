import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminCourses, useAdminStudents } from '@/hooks/useAdmin';
import { formatDate } from '@/lib/utils';
import type { StudentDirectoryRow, StudentFilters } from '@/types';
import { Avatar, DataTable, PageHeader, SearchAndFilters, StatusBadge, type Column } from '@/components/ui';

const PAGE_SIZE = 10;
const clean = (v?: string) => (v && v !== 'all' ? v : undefined);

const AdminStudentsPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ enrollmentStatus: params.get('enrollmentStatus') ?? 'all' });
  const [page, setPage] = useState(1);
  const courses = useAdminCourses();

  const query = useMemo(
    () => ({
      search: search || undefined,
      courseId: clean(filters.courseId),
      paymentStatus: clean(filters.paymentStatus) as StudentFilters['paymentStatus'],
      enrollmentStatus: clean(filters.enrollmentStatus) as StudentFilters['enrollmentStatus'],
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, filters, page],
  );
  const students = useAdminStudents(query);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const columns: Column<StudentDirectoryRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} src={s.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-charcoal-900">{s.name}</p>
            <p className="truncate text-xs text-charcoal-500">{s.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'mobile', header: 'Mobile', render: (s) => <span className="text-charcoal-700">{s.mobile}</span>, hideBelow: 'md' },
    {
      key: 'courses',
      header: 'Courses',
      render: (s) => (
        <span>
          <span className="font-semibold">{s.enrolledCourses}</span> enrolled · <span className="font-semibold">{s.completedCourses}</span> completed
        </span>
      ),
      hideBelow: 'sm',
    },
    { key: 'certs', header: 'Certificates', render: (s) => s.certificates, align: 'center', hideBelow: 'lg' },
    { key: 'payment', header: 'Last payment', render: (s) => <StatusBadge status={s.lastPaymentStatus} label={s.lastPaymentStatus === 'none' ? 'No payments' : undefined} /> },
    { key: 'joined', header: 'Joined', render: (s) => <span className="text-charcoal-700">{formatDate(s.createdAt)}</span>, hideBelow: 'md' },
  ];

  return (
    <div>
      <PageHeader title="Students" description="Every registered student with enrollment, certificate and payment summaries. Open a student to review their record." />
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by name, email or mobile…"
        filters={[
          { key: 'courseId', label: 'Course', options: courses.data?.map((c) => ({ value: c.id, label: c.title })) ?? [] },
          {
            key: 'paymentStatus',
            label: 'Payment',
            options: [
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          {
            key: 'enrollmentStatus',
            label: 'Enrollment',
            options: [
              { value: 'active', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'none', label: 'Not enrolled' },
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
        rows={students.data?.items}
        rowKey={(s) => s.id}
        isLoading={students.isLoading || students.isFetching}
        error={students.error}
        onRetry={() => void students.refetch()}
        onRowClick={(s) => navigate(`/admin/students/${s.id}`)}
        emptyTitle="No students found"
        emptyDescription="Try a different search term or clear the filters."
        pagination={students.data ? { page, pageSize: PAGE_SIZE, total: students.data.total, onPageChange: setPage } : undefined}
        caption="Student directory"
      />
    </div>
  );
};

export default AdminStudentsPage;
