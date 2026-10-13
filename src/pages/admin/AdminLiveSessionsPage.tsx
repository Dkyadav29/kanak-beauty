import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarPlus, CalendarX2, ClipboardCheck } from 'lucide-react';
import { useAdminBatches, useAdminCourses, useAdminSessions, useAdminTrainers, useSessionMutations } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { formatDateTime, formatDuration } from '@/lib/utils';
import type { LiveSession } from '@/types';
import { PermissionGate } from '@/components/auth/guards';
import { Button, ConfirmationDialog, DataTable, Dialog, FormField, InlineAlert, Input, PageHeader, Select, StatusBadge, Tabs, Textarea, useToast, type Column } from '@/components/ui';
import { AttendanceDialog } from './shared/AttendanceDialog';

// ---------------------------------------------------------------------------
// Schedule dialog
// ---------------------------------------------------------------------------

const schema = z.object({
  courseId: z.string().min(1, 'Select a course'),
  batchId: z.string(),
  trainerId: z.string().min(1, 'Select a trainer'),
  title: z.string().trim().min(3, 'At least 3 characters').max(120, 'At most 120 characters'),
  startsAt: z.string().min(1, 'Select a start time'),
  durationMinutes: z.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes').min(15, 'At least 15 minutes'),
  joinWindowMinutesBefore: z.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes').min(0, 'Cannot be negative'),
  description: z.string().trim().max(400, 'At most 400 characters'),
});
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS = Object.keys(schema.shape);

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ScheduleDialog = ({ open, onClose, initialCourseId }: { open: boolean; onClose: () => void; initialCourseId?: string }) => {
  const toast = useToast();
  const courses = useAdminCourses();
  const trainers = useAdminTrainers();
  const { create } = useSessionMutations();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { courseId: initialCourseId ?? '', batchId: '', trainerId: '', title: '', startsAt: defaultStart(), durationMinutes: 90, joinWindowMinutesBefore: 15, description: '' },
  });
  const courseId = watch('courseId');
  const batches = useAdminBatches(courseId ? { courseId, pageSize: 100 } : { pageSize: 1 });
  const batchOptions = useMemo(() => (courseId ? (batches.data?.items ?? []).filter((b) => b.status === 'scheduled' || b.status === 'active') : []), [courseId, batches.data]);

  useEffect(() => {
    if (open) {
      reset({ courseId: initialCourseId ?? '', batchId: '', trainerId: '', title: '', startsAt: defaultStart(), durationMinutes: 90, joinWindowMinutesBefore: 15, description: '' });
      setServerError(null);
    }
  }, [open, initialCourseId, reset]);

  // Pre-fill the trainer from the chosen course when none is selected yet.
  useEffect(() => {
    const course = courses.data?.find((c) => c.id === courseId);
    if (course) setValue('trainerId', course.trainer.id, { shouldDirty: true });
    setValue('batchId', '');
  }, [courseId, courses.data, setValue]);

  const submit = async (v: FormValues) => {
    setServerError(null);
    try {
      const s = await create.mutateAsync({
        courseId: v.courseId,
        batchId: v.batchId || null,
        trainerId: v.trainerId,
        title: v.title,
        startsAt: new Date(v.startsAt).toISOString(),
        durationMinutes: v.durationMinutes,
        joinWindowMinutesBefore: v.joinWindowMinutesBefore,
        description: v.description,
      });
      toast.success('Session scheduled', `"${s.title}" on ${formatDateTime(s.startsAt)}.`);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if (FIELD_KEYS.includes(field)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  const formId = 'schedule-session-form';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Schedule a live session"
      description="Students enrolled in the course (or the chosen batch) can join from the configured window before the start time."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting} leftIcon={<CalendarPlus className="h-4 w-4" />}>
            Schedule
          </Button>
        </>
      }
    >
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}
        </InlineAlert>
      ) : null}
      <form id={formId} onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Course" htmlFor="ss-course" error={errors.courseId?.message} required>
          <Select id="ss-course" invalid={!!errors.courseId} {...register('courseId')}>
            <option value="">Select a course</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Batch (optional)" htmlFor="ss-batch" error={errors.batchId?.message} hint={courseId ? (batchOptions.length === 0 && !batches.isLoading ? 'No open batches for this course' : 'Attendance can only be recorded for batch sessions') : 'Select a course first'}>
          <Select id="ss-batch" disabled={!courseId || batches.isLoading} invalid={!!errors.batchId} {...register('batchId')}>
            <option value="">Whole course (no batch)</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Trainer" htmlFor="ss-trainer" error={errors.trainerId?.message} required>
          <Select id="ss-trainer" invalid={!!errors.trainerId} {...register('trainerId')}>
            <option value="">Select a trainer</option>
            {trainers.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Session title" htmlFor="ss-title" error={errors.title?.message} hint="Use the live lesson's title to auto-complete it on attendance" required>
          <Input id="ss-title" invalid={!!errors.title} {...register('title')} />
        </FormField>
        <FormField label="Starts at" htmlFor="ss-starts" error={errors.startsAt?.message} required>
          <Input id="ss-starts" type="datetime-local" invalid={!!errors.startsAt} {...register('startsAt')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Duration (min)" htmlFor="ss-duration" error={errors.durationMinutes?.message} required>
            <Input id="ss-duration" type="number" min={15} step={5} invalid={!!errors.durationMinutes} {...register('durationMinutes', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Join window (min)" htmlFor="ss-join" error={errors.joinWindowMinutesBefore?.message} required>
            <Input id="ss-join" type="number" min={0} step={5} invalid={!!errors.joinWindowMinutesBefore} {...register('joinWindowMinutesBefore', { valueAsNumber: true })} />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="ss-desc" error={errors.description?.message} className="sm:col-span-2">
          <Textarea id="ss-desc" rows={3} invalid={!!errors.description} placeholder="What will be covered, what students should prepare…" {...register('description')} />
        </FormField>
      </form>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AdminLiveSessionsPage = () => {
  const toast = useToast();
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');
  const [courseId, setCourseId] = useState('all');
  const courses = useAdminCourses();
  const sessions = useAdminSessions({ scope, courseId: courseId !== 'all' ? courseId : undefined });
  const { cancel } = useSessionMutations();
  const [scheduling, setScheduling] = useState(false);
  const [cancelling, setCancelling] = useState<LiveSession | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<LiveSession | null>(null);

  const confirmCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling.id);
      toast.success('Session cancelled', `"${cancelling.title}" has been cancelled.`);
      setCancelling(null);
    } catch (e) {
      toast.error('Could not cancel session', getErrorMessage(e));
    }
  };

  const columns: Column<LiveSession>[] = [
    {
      key: 'title',
      header: 'Session',
      render: (s) => (
        <div className="min-w-0">
          <p className="font-medium text-charcoal-900">{s.title}</p>
          <p className="truncate text-xs text-charcoal-500">{s.courseTitle}</p>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (s) =>
        s.batchId ? (
          <Link to={`/admin/batches/${s.batchId}`} className="text-sm font-medium text-rose-700 hover:underline" onClick={(e) => e.stopPropagation()}>
            View batch
          </Link>
        ) : (
          <span className="text-charcoal-500">Whole course</span>
        ),
      hideBelow: 'lg',
    },
    { key: 'trainer', header: 'Trainer', render: (s) => s.trainerName, hideBelow: 'md' },
    { key: 'starts', header: 'Starts', render: (s) => <span className="whitespace-nowrap">{formatDateTime(s.startsAt)}</span> },
    { key: 'duration', header: 'Duration', render: (s) => formatDuration(s.durationMinutes), hideBelow: 'sm' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <PermissionGate permission="batches:manage">
          <div className="flex justify-end gap-1.5">
            {s.status === 'scheduled' || s.status === 'live' ? (
              <Button size="sm" variant="secondary" onClick={() => setAttendanceFor(s)} leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}>
                Attendance
              </Button>
            ) : null}
            {s.status === 'scheduled' ? (
              <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => setCancelling(s)} aria-label={`Cancel session ${s.title}`} title="Cancel session">
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
        title="Live sessions"
        description="Schedule and manage live classes. Attendance is recorded per batch and completes the matching live lesson for present students."
        actions={
          <PermissionGate permission="batches:manage">
            <Button onClick={() => setScheduling(true)} leftIcon={<CalendarPlus className="h-4 w-4" />}>
              Schedule session
            </Button>
          </PermissionGate>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={scope}
          onChange={(v) => setScope(v as 'upcoming' | 'all')}
          items={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'all', label: 'All sessions' },
          ]}
          className="w-fit"
        />
        <FormField htmlFor="ls-course" label={<span className="sr-only">Filter by course</span>} className="sm:w-72">
          <Select id="ls-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Filter by course">
            <option value="all">Course: All</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <DataTable
        columns={columns}
        rows={sessions.data}
        rowKey={(s) => s.id}
        isLoading={sessions.isLoading}
        error={sessions.error}
        onRetry={() => void sessions.refetch()}
        emptyTitle={scope === 'upcoming' ? 'No upcoming sessions' : 'No sessions found'}
        emptyDescription={scope === 'upcoming' ? 'Schedule a live class to see it here.' : 'Sessions for the selected course will appear here.'}
        emptyAction={
          <PermissionGate permission="batches:manage">
            <Button variant="secondary" size="sm" onClick={() => setScheduling(true)}>
              Schedule session
            </Button>
          </PermissionGate>
        }
        caption="Live sessions"
      />

      <ScheduleDialog open={scheduling} onClose={() => setScheduling(false)} initialCourseId={courseId !== 'all' ? courseId : undefined} />

      <ConfirmationDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
        variant="danger"
        title="Cancel this session?"
        description={cancelling ? `"${cancelling.title}" on ${formatDateTime(cancelling.startsAt)} will be cancelled for all enrolled students. This cannot be undone.` : undefined}
        confirmLabel="Cancel session"
        cancelLabel="Keep session"
        loading={cancel.isPending}
      />

      {attendanceFor ? <AttendanceDialog session={attendanceFor} onClose={() => setAttendanceFor(null)} /> : null}
    </div>
  );
};

export default AdminLiveSessionsPage;
