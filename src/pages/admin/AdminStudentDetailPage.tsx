import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useAdminCourses, useAdminStudent, useEnrollmentMutations } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { StudentDetailAdminView } from '@/types';
import { PermissionGate } from '@/components/auth/guards';
import { Avatar, Badge, Button, Card, CardBody, DataTable, Dialog, ErrorState, FormField, KeyValue, LinkButton, LoadingSkeleton, PageHeader, ProgressBar, Select, StatusBadge, Tabs, Textarea, useToast, type Column } from '@/components/ui';

type EnrollmentRow = StudentDetailAdminView['enrollments'][number];
type PaymentRow = StudentDetailAdminView['payments'][number];
type CertificateRow = StudentDetailAdminView['certificates'][number];

const GrantAccessDialog = ({ studentId, studentName, onClose }: { studentId: string; studentName: string; onClose: () => void }) => {
  const toast = useToast();
  const courses = useAdminCourses();
  const { grant } = useEnrollmentMutations();
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const valid = courseId !== '' && reason.trim().length >= 5;

  const submit = async () => {
    try {
      await grant.mutateAsync({ studentId, courseId, reason: reason.trim() });
      toast.success('Access granted', `${studentName} now has access to the course. The grant is recorded in the audit log.`);
      onClose();
    } catch (e) {
      toast.error('Could not grant access', getErrorMessage(e));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Grant course access"
      description={`Manually enroll ${studentName} without a payment. This is audited and requires a reason.`}
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
        <FormField label="Reason" htmlFor="grant-reason" hint="At least 5 characters. Stored in the audit log." required>
          <Textarea id="grant-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Scholarship approved by the director on 12 Oct" />
        </FormField>
      </div>
    </Dialog>
  );
};

const AdminStudentDetailPage = () => {
  const { studentId } = useParams();
  const student = useAdminStudent(studentId);
  const [tab, setTab] = useState('enrollments');
  const [granting, setGranting] = useState(false);

  if (student.isLoading) return <LoadingSkeleton variant="page" />;
  if (student.error || !student.data) return <ErrorState error={student.error} onRetry={() => void student.refetch()} />;
  const { profile, enrollments, payments, certificates } = student.data;

  const enrollmentColumns: Column<EnrollmentRow>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (e) => (
        <div>
          <p className="font-medium text-charcoal-900">{e.courseTitle}</p>
          <p className="text-xs text-charcoal-500">{e.batchName ?? 'No batch'}</p>
        </div>
      ),
    },
    { key: 'access', header: 'Access', render: (e) => <StatusBadge status={e.accessStatus} /> },
    { key: 'progress', header: 'Progress', render: (e) => <ProgressBar value={e.progressPercent} showLabel size="sm" className="min-w-[140px]" />, hideBelow: 'sm' },
    { key: 'attendance', header: 'Attendance', render: (e) => (e.attendancePercent === null ? '—' : `${e.attendancePercent}%`), align: 'center', hideBelow: 'md' },
    { key: 'enrolled', header: 'Enrolled', render: (e) => formatDate(e.enrolledAt), hideBelow: 'lg' },
    { key: 'completed', header: 'Completed', render: (e) => formatDate(e.completedAt), hideBelow: 'lg' },
  ];

  const paymentColumns: Column<PaymentRow>[] = [
    { key: 'order', header: 'Order', render: (p) => <span className="font-mono text-xs">{p.orderId}</span> },
    { key: 'course', header: 'Course', render: (p) => p.courseTitle, hideBelow: 'sm' },
    { key: 'amount', header: 'Amount', render: (p) => <span className="font-semibold">{formatCurrency(p.amount, p.currency)}</span>, align: 'right' },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'date', header: 'Date', render: (p) => formatDateTime(p.createdAt), hideBelow: 'md' },
  ];

  const certificateColumns: Column<CertificateRow>[] = [
    { key: 'number', header: 'Certificate no.', render: (c) => <span className="font-mono text-xs">{c.certificateNumber}</span> },
    { key: 'course', header: 'Course', render: (c) => c.courseTitle },
    { key: 'issued', header: 'Issued', render: (c) => formatDate(c.issuedAt), hideBelow: 'md' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'verify',
      header: '',
      align: 'right',
      render: (c) => (
        <Link to={`/verify/${encodeURIComponent(c.certificateNumber)}`} className="text-sm font-semibold text-rose-700 hover:underline">
          Verify
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/admin/students" className="inline-flex items-center gap-1 hover:text-rose-700">
            <ArrowLeft className="h-4 w-4" /> Students
          </Link>
        }
        title={profile.name}
        description="Student record: profile, enrollments, payments and certificates."
        actions={
          <PermissionGate permission="enrollments:manage">
            <Button onClick={() => setGranting(true)} leftIcon={<KeyRound className="h-4 w-4" />}>
              Grant course access
            </Button>
          </PermissionGate>
        }
      />

      <Card className="mb-6">
        <CardBody className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex items-center gap-4 md:w-64 md:shrink-0">
            <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-charcoal-900">{profile.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={profile.emailVerified ? 'success' : 'warning'} dot>
                  {profile.emailVerified ? 'Email verified' : 'Email unverified'}
                </Badge>
              </div>
            </div>
          </div>
          <KeyValue
            className="flex-1 lg:grid-cols-3"
            items={[
              { label: 'Email', value: profile.email },
              { label: 'Mobile', value: profile.mobile },
              { label: 'Joined', value: formatDate(profile.createdAt) },
              { label: 'Date of birth', value: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : '—' },
              { label: 'Address', value: profile.address ?? '—' },
              { label: 'Student ID', value: <span className="font-mono text-xs">{profile.id}</span> },
            ]}
          />
        </CardBody>
      </Card>

      <Tabs
        className="mb-4 w-fit max-w-full"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'enrollments', label: 'Enrollments', count: enrollments.length },
          { value: 'payments', label: 'Payments', count: payments.length },
          { value: 'certificates', label: 'Certificates', count: certificates.length },
        ]}
      />

      {tab === 'enrollments' ? (
        <DataTable
          columns={enrollmentColumns}
          rows={enrollments}
          rowKey={(e) => e.enrollmentId}
          emptyTitle="No enrollments"
          emptyDescription="This student has not enrolled in any course yet."
          emptyAction={
            <PermissionGate permission="enrollments:manage">
              <Button variant="secondary" size="sm" onClick={() => setGranting(true)}>
                Grant course access
              </Button>
            </PermissionGate>
          }
          caption="Enrollments"
        />
      ) : tab === 'payments' ? (
        <DataTable
          columns={paymentColumns}
          rows={payments}
          rowKey={(p) => p.id}
          emptyTitle="No payments"
          emptyDescription="Orders placed by this student will appear here."
          emptyAction={
            <LinkButton to="/admin/payments" variant="outline" size="sm">
              Open payments
            </LinkButton>
          }
          caption="Payments"
        />
      ) : (
        <DataTable columns={certificateColumns} rows={certificates} rowKey={(c) => c.id} emptyTitle="No certificates" emptyDescription="Certificates are issued once a course's completion criteria are met." caption="Certificates" />
      )}

      {granting ? <GrantAccessDialog studentId={profile.id} studentName={profile.name} onClose={() => setGranting(false)} /> : null}
    </div>
  );
};

export default AdminStudentDetailPage;
