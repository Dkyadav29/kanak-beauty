import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, CalendarX2, ClipboardCheck, Pencil, UserMinus, UserPlus } from 'lucide-react';
import { useAdminBatch, useAdminSessions, useBatchMutations, useEnrolledStudents, useSessionMutations } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, formatDateTime, formatDuration, percent, titleCase } from '@/lib/utils';
import type { BatchHistoryEventType, BatchStatus, BatchStudentRow, LiveSession } from '@/types';
import { PermissionGate } from '@/components/auth/guards';
import { Badge, Button, Card, CardBody, ConfirmationDialog, DataTable, Dialog, EmptyState, ErrorState, FormField, InlineAlert, KeyValue, LoadingSkeleton, PageHeader, ProgressBar, Select, StatusBadge, Tabs, Textarea, useToast, type BadgeTone, type Column } from '@/components/ui';
import { AttendanceDialog } from './shared/AttendanceDialog';
import { BatchFormDialog } from './shared/BatchFormDialog';

/** Mirrors the backend transition table; the backend remains the source of truth. */
const ALLOWED_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  scheduled: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

const HISTORY_TONE: Record<BatchHistoryEventType, BadgeTone> = {
  batch_created: 'rose',
  batch_updated: 'neutral',
  status_changed: 'gold',
  student_added: 'success',
  student_withdrawn: 'danger',
  student_completed: 'success',
  session_scheduled: 'info',
  session_completed: 'success',
  session_cancelled: 'danger',
  attendance_recorded: 'info',
  certificate_issued: 'success',
  certificate_revoked: 'danger',
};

const AdminBatchDetailPage = () => {
  const { batchId } = useParams();
  const toast = useToast();
  const batch = useAdminBatch(batchId);
  const sessions = useAdminSessions({ batchId });
  const { update, changeStatus, addStudent, withdrawStudent } = useBatchMutations();
  const { cancel } = useSessionMutations();
  const [tab, setTab] = useState('students');

  const [editing, setEditing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<BatchStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [withdrawing, setWithdrawing] = useState<BatchStudentRow | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [cancelling, setCancelling] = useState<LiveSession | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<LiveSession | null>(null);

  const eligible = useEnrolledStudents(addOpen ? batch.data?.courseId : undefined);
  const candidates = useMemo(() => {
    if (!batch.data || !eligible.data) return [];
    const inBatch = new Set(batch.data.students.filter((s) => s.enrollment.status !== 'withdrawn').map((s) => s.studentId));
    return eligible.data.filter((s) => !inBatch.has(s.studentId));
  }, [batch.data, eligible.data]);

  if (batch.isLoading) return <LoadingSkeleton variant="page" />;
  if (batch.error || !batch.data) return <ErrorState error={batch.error} onRetry={() => void batch.refetch()} />;
  const b = batch.data;
  const archived = b.status === 'archived';
  const closed = b.status === 'completed' || b.status === 'cancelled' || archived;
  const allowedNext = ALLOWED_TRANSITIONS[b.status];

  const run = async (fn: () => Promise<unknown>, success: [string, string?], failure: string, after?: () => void) => {
    try {
      await fn();
      toast.success(success[0], success[1]);
      after?.();
    } catch (e) {
      toast.error(failure, getErrorMessage(e));
    }
  };

  const studentColumns: Column<BatchStudentRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (s) => (
        <div className="min-w-0">
          <Link to={`/admin/students/${s.studentId}`} className="font-medium text-charcoal-900 hover:text-rose-700">
            {s.studentName}
          </Link>
          <p className="truncate text-xs text-charcoal-500">{s.studentEmail}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.enrollment.status} /> },
    { key: 'progress', header: 'Progress', render: (s) => <ProgressBar value={s.progressPercent} showLabel size="sm" className="min-w-[140px]" />, hideBelow: 'sm' },
    { key: 'attendance', header: 'Attendance', render: (s) => (s.attendancePercent === null ? '—' : `${s.attendancePercent}%`), align: 'center', hideBelow: 'md' },
    { key: 'certificate', header: 'Certificate', render: (s) => (s.certificateNumber ? <span className="font-mono text-xs">{s.certificateNumber}</span> : <span className="text-charcoal-500">—</span>), hideBelow: 'lg' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) =>
        !archived && s.enrollment.status !== 'completed' && s.enrollment.status !== 'withdrawn' ? (
          <PermissionGate permission="batches:manage">
            <Button
              size="sm"
              variant="ghost"
              className="text-red-700 hover:bg-red-50"
              onClick={() => {
                setWithdrawReason('');
                setWithdrawing(s);
              }}
              leftIcon={<UserMinus className="h-3.5 w-3.5" />}
            >
              Withdraw
            </Button>
          </PermissionGate>
        ) : null,
    },
  ];

  const sessionColumns: Column<LiveSession>[] = [
    {
      key: 'title',
      header: 'Session',
      render: (s) => (
        <div>
          <p className="font-medium text-charcoal-900">{s.title}</p>
          <p className="text-xs text-charcoal-500">{s.trainerName}</p>
        </div>
      ),
    },
    { key: 'starts', header: 'Starts', render: (s) => <span className="whitespace-nowrap">{formatDateTime(s.startsAt)}</span> },
    { key: 'duration', header: 'Duration', render: (s) => formatDuration(s.durationMinutes), hideBelow: 'md' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) =>
        archived ? null : (
          <PermissionGate permission="batches:manage">
            <div className="flex justify-end gap-1.5">
              {s.status === 'scheduled' || s.status === 'live' ? (
                <Button size="sm" variant="secondary" onClick={() => setAttendanceFor(s)} leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}>
                  Record attendance
                </Button>
              ) : null}
              {s.status === 'scheduled' ? (
                <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => setCancelling(s)} aria-label={`Cancel session ${s.title}`}>
                  <CalendarX2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </PermissionGate>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/admin/batches" className="inline-flex items-center gap-1 hover:text-rose-700">
            <ArrowLeft className="h-4 w-4" /> Batches
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {b.name}
            <StatusBadge status={b.status} />
          </span>
        }
        description={
          <span className="font-mono text-sm">
            {b.code} · <span className="font-sans">{b.courseTitle}</span>
          </span>
        }
        actions={
          <PermissionGate permission="batches:manage">
            <Button variant="outline" onClick={() => setEditing(true)} disabled={archived} leftIcon={<Pencil className="h-4 w-4" />}>
              Edit details
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNextStatus(allowedNext[0] ?? '');
                setStatusReason('');
                setStatusOpen(true);
              }}
              disabled={allowedNext.length === 0}
              leftIcon={<ArrowRightLeft className="h-4 w-4" />}
            >
              Change status
            </Button>
            <Button
              onClick={() => {
                setAddStudentId('');
                setAddOpen(true);
              }}
              disabled={closed}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Add student
            </Button>
          </PermissionGate>
        }
      />

      {archived ? (
        <InlineAlert tone="info" className="mb-6">
          This batch is archived and read-only. Its students, sessions and history are preserved for records.
        </InlineAlert>
      ) : null}

      <Card className="mb-6">
        <CardBody>
          <KeyValue
            className="lg:grid-cols-4"
            items={[
              { label: 'Course', value: <Link to={`/admin/courses/${b.courseId}`} className="font-medium text-rose-700 hover:underline">{b.courseTitle}</Link> },
              { label: 'Trainer', value: b.trainerName },
              { label: 'Dates', value: `${formatDate(b.startDate)} – ${formatDate(b.endDate)}` },
              {
                label: 'Capacity',
                value: (
                  <div>
                    <span className="font-semibold">{b.totalStudents}</span> / {b.capacity} seats
                    <ProgressBar value={percent(b.totalStudents, b.capacity)} size="sm" className="mt-1.5 max-w-[200px]" />
                  </div>
                ),
              },
              { label: 'Schedule', value: b.scheduleNote || '—' },
              { label: 'Created', value: formatDateTime(b.createdAt) },
              { label: 'Last updated', value: formatDateTime(b.updatedAt) },
              { label: 'Batch ID', value: <span className="font-mono text-xs">{b.id}</span> },
            ]}
          />
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total students', value: b.totalStudents },
          { label: 'In progress', value: b.inProgressStudents },
          { label: 'Completed', value: b.completedStudents },
          { label: 'Withdrawn', value: b.withdrawnStudents },
          { label: 'Sessions', value: b.sessionCount },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-charcoal-500">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-charcoal-900">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs
        className="mb-4 w-fit max-w-full"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'students', label: 'Students', count: b.students.length },
          { value: 'sessions', label: 'Sessions', count: sessions.data?.length ?? b.sessionCount },
          { value: 'history', label: 'History', count: b.history.length },
        ]}
      />

      {tab === 'students' ? (
        <DataTable columns={studentColumns} rows={b.students} rowKey={(s) => s.enrollment.id} emptyTitle="No students in this batch" emptyDescription="Only students with active access to the course can be added." caption="Batch students" />
      ) : tab === 'sessions' ? (
        <DataTable
          columns={sessionColumns}
          rows={sessions.data}
          rowKey={(s) => s.id}
          isLoading={sessions.isLoading}
          error={sessions.error}
          onRetry={() => void sessions.refetch()}
          emptyTitle="No sessions scheduled"
          emptyDescription="Schedule live sessions for this batch from the Live Sessions page."
          emptyAction={
            <Link to="/admin/live-sessions" className="text-sm font-semibold text-rose-700 hover:underline">
              Open live sessions
            </Link>
          }
          caption="Batch sessions"
        />
      ) : b.history.length === 0 ? (
        <EmptyState title="No history yet" compact />
      ) : (
        <Card>
          <ol className="divide-y divide-ivory-200">
            {b.history.map((h) => (
              <li key={h.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
                <Badge tone={HISTORY_TONE[h.type] ?? 'neutral'} className="w-fit shrink-0">
                  {titleCase(h.type)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-charcoal-800">{h.description}</p>
                  <p className="mt-0.5 text-xs text-charcoal-500">
                    {h.actorName} · {formatDateTime(h.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Edit details */}
      <BatchFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        initial={b}
        title="Edit batch details"
        onSubmit={async (payload) => {
          await update.mutateAsync({ id: b.id, payload });
          toast.success('Batch updated', `${b.code} details saved.`);
        }}
      />

      {/* Change status */}
      <Dialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Change batch status"
        description={`Current status: ${titleCase(b.status)}. Only the transitions allowed from this state are offered.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusOpen(false)} disabled={changeStatus.isPending}>
              Cancel
            </Button>
            <Button
              variant={nextStatus === 'cancelled' ? 'danger' : 'primary'}
              loading={changeStatus.isPending}
              disabled={!nextStatus}
              onClick={() =>
                void run(
                  () => changeStatus.mutateAsync({ id: b.id, status: nextStatus as BatchStatus, reason: statusReason.trim() || undefined }),
                  ['Status updated', `${b.code} is now ${nextStatus}.`],
                  'Could not change status',
                  () => setStatusOpen(false),
                )
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="New status" htmlFor="batch-next-status" required>
            <Select id="batch-next-status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as BatchStatus)}>
              {allowedNext.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </FormField>
          {nextStatus === 'cancelled' ? <InlineAlert tone="warning">Cancelling will also cancel every scheduled session in this batch.</InlineAlert> : null}
          {nextStatus === 'archived' ? <InlineAlert tone="info">Archived batches become read-only. All records are preserved.</InlineAlert> : null}
          <FormField label="Reason (optional)" htmlFor="batch-status-reason" hint="Recorded in the batch history and audit log">
            <Textarea id="batch-status-reason" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} maxLength={240} rows={3} />
          </FormField>
        </div>
      </Dialog>

      {/* Add student */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add student to batch"
        description="Only students with active access to this course who are not already in the batch are listed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={addStudent.isPending}>
              Cancel
            </Button>
            <Button
              loading={addStudent.isPending}
              disabled={!addStudentId}
              onClick={() =>
                void run(
                  () => addStudent.mutateAsync({ id: b.id, studentId: addStudentId }),
                  ['Student added', 'The student now belongs to this batch.'],
                  'Could not add student',
                  () => setAddOpen(false),
                )
              }
            >
              Add student
            </Button>
          </>
        }
      >
        {eligible.isLoading ? (
          <LoadingSkeleton variant="list" count={3} />
        ) : eligible.error ? (
          <ErrorState error={eligible.error} onRetry={() => void eligible.refetch()} compact />
        ) : candidates.length === 0 ? (
          <InlineAlert tone="info">No eligible students. Students need an active enrollment in {b.courseTitle} first.</InlineAlert>
        ) : (
          <div className="space-y-3">
            {b.totalStudents >= b.capacity ? <InlineAlert tone="warning">This batch is at capacity ({b.capacity} seats). Adding another student will be rejected.</InlineAlert> : null}
            <FormField label="Student" htmlFor="batch-add-student" required>
              <Select id="batch-add-student" value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
                <option value="">Select a student</option>
                {candidates.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.name} — {s.email}
                    {s.batchId ? ' (in another batch)' : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}
      </Dialog>

      {/* Withdraw */}
      <ConfirmationDialog
        open={withdrawing !== null}
        onClose={() => setWithdrawing(null)}
        variant="danger"
        title="Withdraw student?"
        description={withdrawing ? `${withdrawing.studentName} will be removed from ${b.code}. Their course access is not affected.` : undefined}
        confirmLabel="Withdraw"
        loading={withdrawStudent.isPending}
        onConfirm={() =>
          withdrawing
            ? run(
                () => withdrawStudent.mutateAsync({ id: b.id, studentId: withdrawing.studentId, reason: withdrawReason.trim() || undefined }),
                ['Student withdrawn', `${withdrawing.studentName} was withdrawn from the batch.`],
                'Could not withdraw student',
                () => setWithdrawing(null),
              )
            : undefined
        }
      >
        <FormField label="Reason (optional)" htmlFor="withdraw-reason" hint="Recorded in the batch history">
          <Textarea id="withdraw-reason" value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} maxLength={240} rows={3} />
        </FormField>
      </ConfirmationDialog>

      {/* Cancel session */}
      <ConfirmationDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        variant="danger"
        title="Cancel this session?"
        description={cancelling ? `"${cancelling.title}" on ${formatDateTime(cancelling.startsAt)} will be cancelled for all students.` : undefined}
        confirmLabel="Cancel session"
        cancelLabel="Keep session"
        loading={cancel.isPending}
        onConfirm={() => (cancelling ? run(() => cancel.mutateAsync(cancelling.id), ['Session cancelled'], 'Could not cancel session', () => setCancelling(null)) : undefined)}
      />

      {attendanceFor ? <AttendanceDialog session={attendanceFor} students={b.students} onClose={() => setAttendanceFor(null)} /> : null}
    </div>
  );
};

export default AdminBatchDetailPage;
