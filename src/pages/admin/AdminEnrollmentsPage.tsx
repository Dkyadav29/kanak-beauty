import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, PauseCircle, PlayCircle } from 'lucide-react';
import { useAdminCourses, useAdminEnrollments, useEnrollmentMutations } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';
import { formatAmount } from '@/lib/coursePricing';
import type { EnrollmentAdminRow, EnrollmentFilters } from '@/types';
import { PermissionGate } from '@/components/auth/guards';
import { Button, ConfirmationDialog, DataTable, Dialog, FormField, InlineAlert, Input, PageHeader, SearchAndFilters, Select, StatusBadge, Textarea, useToast, type Column } from '@/components/ui';

const PAGE_SIZE = 10;
const clean = (v?: string) => (v && v !== 'all' ? v : undefined);
type AccessChange = { row: EnrollmentAdminRow; next: 'active' | 'suspended' } | null;

/** Installment history of one enrollment (opened from the Payment column). */
const InstallmentsDialog = ({ row, onClose }: { row: EnrollmentAdminRow; onClose: () => void }) => {
  const plan = row.installmentPlan!;
  return (
    <Dialog open onClose={onClose} title={`${row.studentName} · ${row.courseTitle}`} description={`${titleCase(plan.planType)} plan · ${row.batchName ?? 'No batch assigned'}`} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <p className="mb-3 text-sm text-charcoal-700">
        {formatAmount(plan.paidAmount, row.currency)} of {formatAmount(plan.totalAmount, row.currency)} paid · {plan.paidCount}/{plan.installmentCount} installments
        {plan.isOverdue ? <span className="ml-2 font-semibold text-red-700">Overdue</span> : null}
      </p>
      <div className="overflow-hidden rounded-xl border border-ivory-300">
        <table className="w-full text-sm">
          <thead className="bg-ivory-100 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {plan.installments.map((i) => (
              <tr key={i.sequence}>
                <td className="px-3 py-2">{i.kind === 'deposit' ? 'Deposit' : i.sequence}</td>
                <td className="px-3 py-2">{formatDate(i.dueDate)}</td>
                <td className="px-3 py-2 text-right">{formatAmount(i.amount, row.currency)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={i.status} />
                  {i.paidAt ? <span className="ml-2 text-xs text-charcoal-500">{formatDate(i.paidAt)}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
};

const GrantDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const toast = useToast();
  const courses = useAdminCourses();
  const { grant } = useEnrollmentMutations();
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const valid = studentId.trim() !== '' && courseId !== '' && reason.trim().length >= 5;

  const submit = async () => {
    try {
      const row = await grant.mutateAsync({ studentId: studentId.trim(), courseId, reason: reason.trim() });
      toast.success('Access granted', `${row.studentName} now has access to "${row.courseTitle}".`);
      setStudentId('');
      setCourseId('');
      setReason('');
      onClose();
    } catch (e) {
      toast.error('Could not grant access', getErrorMessage(e));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Grant course access"
      description="Creates an audited manual enrollment without a payment. Use the student ID shown on the student's record."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={grant.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={grant.isPending} disabled={!valid}>
            Grant access
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Student ID" htmlFor="grant-student" hint={<>Copy it from the <Link to="/admin/students" className="font-semibold text-rose-700 hover:underline">student record</Link>.</>} required>
          <Input id="grant-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. usr_…" className="font-mono" autoComplete="off" />
        </FormField>
        <FormField label="Course" htmlFor="grant-course" required>
          <Select id="grant-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select a course</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reason" htmlFor="grant-reason" hint="At least 5 characters; stored in the audit log" required>
          <Textarea id="grant-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} placeholder="e.g. Scholarship approved by the director" />
        </FormField>
      </div>
    </Dialog>
  );
};

const AdminEnrollmentsPage = () => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [granting, setGranting] = useState(false);
  const [change, setChange] = useState<AccessChange>(null);
  const [installmentsFor, setInstallmentsFor] = useState<EnrollmentAdminRow | null>(null);
  const [reason, setReason] = useState('');
  const courses = useAdminCourses();
  const { setAccess } = useEnrollmentMutations();

  const query = useMemo(
    () => ({
      search: search || undefined,
      courseId: clean(filters.courseId),
      paymentStatus: clean(filters.paymentStatus) as EnrollmentFilters['paymentStatus'],
      accessStatus: clean(filters.accessStatus) as EnrollmentFilters['accessStatus'],
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, filters, page],
  );
  const enrollments = useAdminEnrollments(query);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const confirmChange = async () => {
    if (!change) return;
    try {
      await setAccess.mutateAsync({ id: change.row.enrollmentId, accessStatus: change.next, reason: reason.trim() });
      toast.success(change.next === 'suspended' ? 'Access suspended' : 'Access reactivated', `${change.row.studentName} · ${change.row.courseTitle}`);
      setChange(null);
      setReason('');
    } catch (e) {
      toast.error('Could not update access', getErrorMessage(e));
    }
  };

  const columns: Column<EnrollmentAdminRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div className="min-w-0">
          <Link to={`/admin/students/${r.studentId}`} className="font-medium text-charcoal-900 hover:text-rose-700">
            {r.studentName}
          </Link>
          <p className="truncate text-xs text-charcoal-500">{r.studentEmail}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (r) => (
        <div>
          <p>{r.courseTitle}</p>
          {r.batchName ? <p className="text-xs text-charcoal-500">{r.batchName}</p> : <p className="text-xs text-amber-700">No batch assigned</p>}
        </div>
      ),
      hideBelow: 'md',
    },
    {
      key: 'ids',
      header: 'Enrollment / Order',
      render: (r) => (
        <div className="font-mono text-xs text-charcoal-700">
          <p className="max-w-[140px] truncate" title={r.enrollmentId}>
            {r.enrollmentId}
          </p>
          <p className="text-charcoal-500">{r.orderId ?? '—'}</p>
        </div>
      ),
      hideBelow: 'lg',
    },
    { key: 'amount', header: 'Amount', render: (r) => (r.amount === null ? <span className="text-charcoal-500">—</span> : <span className="font-semibold">{formatCurrency(r.amount, r.currency)}</span>), align: 'right', hideBelow: 'sm' },
    {
      key: 'payment',
      header: 'Payment',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={r.paymentStatus} label={r.paymentStatus === 'none' ? 'No payment' : undefined} />
          {r.refundStatus !== 'none' ? <StatusBadge status={r.refundStatus} label={`Refund ${r.refundStatus}`} /> : null}
          {r.installmentPlan ? (
            <button type="button" onClick={() => setInstallmentsFor(r)} className="w-full text-left text-xs font-semibold text-rose-700 hover:underline">
              {titleCase(r.installmentPlan.planType)} · {r.installmentPlan.paidCount}/{r.installmentPlan.installmentCount} paid{r.installmentPlan.isOverdue ? ' · overdue' : ''}
            </button>
          ) : null}
        </div>
      ),
    },
    { key: 'access', header: 'Access', render: (r) => <StatusBadge status={r.accessStatus} /> },
    { key: 'source', header: 'Source', render: (r) => <StatusBadge status={r.source} />, hideBelow: 'xl' },
    { key: 'enrolled', header: 'Enrolled', render: (r) => <span className="whitespace-nowrap">{formatDate(r.enrolledAt)}</span>, hideBelow: 'lg' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <PermissionGate permission="enrollments:manage">
          {r.accessStatus === 'active' ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-700 hover:bg-amber-50"
              onClick={() => {
                setReason('');
                setChange({ row: r, next: 'suspended' });
              }}
              leftIcon={<PauseCircle className="h-3.5 w-3.5" />}
            >
              Suspend
            </Button>
          ) : r.accessStatus === 'suspended' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setReason('');
                setChange({ row: r, next: 'active' });
              }}
              leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
            >
              Reactivate
            </Button>
          ) : null}
        </PermissionGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Who has access to which course, how it was obtained, and whether payment is settled."
        actions={
          <PermissionGate permission="enrollments:manage">
            <Button onClick={() => setGranting(true)} leftIcon={<KeyRound className="h-4 w-4" />}>
              Grant access
            </Button>
          </PermissionGate>
        }
      />
      <InlineAlert tone="info" className="mb-4">
        Payments cannot be marked as paid here. Access is granted only after verified payment or an audited manual grant.
      </InlineAlert>
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by student, email, order or enrollment ID…"
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
              { value: 'none', label: 'No payment (granted)' },
            ],
          },
          {
            key: 'accessStatus',
            label: 'Access',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'pending_payment', label: 'Pending payment' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'revoked', label: 'Revoked' },
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
        rows={enrollments.data?.items}
        rowKey={(r) => r.enrollmentId}
        isLoading={enrollments.isLoading || enrollments.isFetching}
        error={enrollments.error}
        onRetry={() => void enrollments.refetch()}
        emptyTitle="No enrollments found"
        emptyDescription="Try a different search or clear the filters."
        pagination={enrollments.data ? { page, pageSize: PAGE_SIZE, total: enrollments.data.total, onPageChange: setPage } : undefined}
        caption="Enrollments"
      />

      <GrantDialog open={granting} onClose={() => setGranting(false)} />
      {installmentsFor ? <InstallmentsDialog row={installmentsFor} onClose={() => setInstallmentsFor(null)} /> : null}

      <ConfirmationDialog
        open={change !== null}
        onClose={() => setChange(null)}
        onConfirm={confirmChange}
        variant={change?.next === 'suspended' ? 'danger' : 'primary'}
        title={change?.next === 'suspended' ? 'Suspend access?' : 'Reactivate access?'}
        description={
          change
            ? change.next === 'suspended'
              ? `${change.row.studentName} will lose access to "${change.row.courseTitle}" until reactivated. Their payment record is unchanged.`
              : `${change.row.studentName} will regain access to "${change.row.courseTitle}".`
            : undefined
        }
        confirmLabel={change?.next === 'suspended' ? 'Suspend' : 'Reactivate'}
        loading={setAccess.isPending}
        disabled={reason.trim().length < 5}
      >
        <FormField label="Reason" htmlFor="access-reason" hint="Required, at least 5 characters. Stored in the audit log." required>
          <Textarea id="access-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} rows={3} />
        </FormField>
      </ConfirmationDialog>
    </div>
  );
};

export default AdminEnrollmentsPage;
