import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useAdminBatch, useSessionMutations } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/utils';
import type { AttendanceStatus, BatchStudentRow, LiveSession } from '@/types';
import { Button, Dialog, ErrorState, InlineAlert, LoadingSkeleton, Select, useToast } from '@/components/ui';

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent'];

/**
 * Records attendance for one live session. Attendance is per batch: when the
 * caller does not pass the roster, it is loaded from the session's batch.
 */
export const AttendanceDialog = ({ session, students, onClose }: { session: LiveSession; students?: BatchStudentRow[]; onClose: () => void }) => {
  const toast = useToast();
  const { attendance } = useSessionMutations();
  const batch = useAdminBatch(students ? undefined : session.batchId ?? undefined);
  const roster = useMemo(() => (students ?? batch.data?.students ?? []).filter((s) => s.enrollment.status !== 'withdrawn'), [students, batch.data]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const statusFor = (studentId: string): AttendanceStatus => records[studentId] ?? 'present';
  const markAll = (status: AttendanceStatus) => setRecords(Object.fromEntries(roster.map((s) => [s.studentId, status])));

  const submit = async () => {
    try {
      const res = await attendance.mutateAsync({ id: session.id, records: roster.map((s) => ({ studentId: s.studentId, status: statusFor(s.studentId) })) });
      toast.success('Attendance recorded', `${res.recorded} student${res.recorded === 1 ? '' : 's'} marked for "${session.title}".`);
      onClose();
    } catch (e) {
      toast.error('Could not record attendance', getErrorMessage(e));
    }
  };

  const noBatch = !session.batchId;
  const loading = !students && !!session.batchId && batch.isLoading;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Record attendance"
      description={`${session.title} · ${formatDateTime(session.startsAt)}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={attendance.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={attendance.isPending} disabled={noBatch || roster.length === 0} leftIcon={<ClipboardCheck className="h-4 w-4" />}>
            Save attendance
          </Button>
        </>
      }
    >
      {noBatch ? (
        <InlineAlert tone="warning">Attendance is recorded per batch. This session is not linked to a batch, so there is no roster to mark.</InlineAlert>
      ) : loading ? (
        <LoadingSkeleton variant="table" count={4} />
      ) : batch.error && !students ? (
        <ErrorState error={batch.error} onRetry={() => void batch.refetch()} compact />
      ) : roster.length === 0 ? (
        <InlineAlert tone="info">No active students in this batch yet. Add students to the batch before recording attendance.</InlineAlert>
      ) : (
        <div className="space-y-4">
          <InlineAlert tone="info">Saving marks the session as completed. Present and late students also complete the matching live lesson in the curriculum.</InlineAlert>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Mark all</span>
            {STATUSES.map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => markAll(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <ul className="divide-y divide-ivory-200 rounded-2xl border border-ivory-300">
            {roster.map((s) => {
              const id = `att-${s.studentId}`;
              return (
                <li key={s.studentId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <label htmlFor={id} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-charcoal-900">{s.studentName}</span>
                    <span className="block truncate text-xs text-charcoal-500">{s.studentEmail}</span>
                  </label>
                  <Select id={id} value={statusFor(s.studentId)} onChange={(e) => setRecords((r) => ({ ...r, [s.studentId]: e.target.value as AttendanceStatus }))} className="sm:w-36">
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st[0].toUpperCase() + st.slice(1)}
                      </option>
                    ))}
                  </Select>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Dialog>
  );
};
