import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Eye, RotateCcw, ShieldX } from 'lucide-react';
import { useAdminCertificates, useAdminCourses, useCertificateMutations, useEligibleStudents } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Certificate, CertificateFilters, EligibleStudent } from '@/types';
import { CertificatePreview } from '@/components/shared/CertificatePreview';
import { Badge, Button, ConfirmationDialog, DataTable, Dialog, FormField, InlineAlert, KeyValue, LinkButton, PageHeader, SearchAndFilters, StatusBadge, Tabs, Textarea, useToast, type Column } from '@/components/ui';

const PAGE_SIZE = 10;
const clean = (v?: string) => (v && v !== 'all' ? v : undefined);
type ReasonAction = { cert: Certificate; action: 'revoke' | 'reissue' } | null;

// ---------------------------------------------------------------------------
// Issued certificates
// ---------------------------------------------------------------------------

const IssuedTab = () => {
  const toast = useToast();
  const courses = useAdminCourses();
  const { revoke, reissue } = useCertificateMutations();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [pending, setPending] = useState<ReasonAction>(null);
  const [reason, setReason] = useState('');

  const query = useMemo(() => ({ search: search || undefined, status: clean(filters.status) as CertificateFilters['status'], courseId: clean(filters.courseId), page, pageSize: PAGE_SIZE }), [search, filters, page]);
  const certificates = useAdminCertificates(query);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const confirm = async () => {
    if (!pending) return;
    try {
      if (pending.action === 'revoke') {
        await revoke.mutateAsync({ id: pending.cert.id, reason: reason.trim() });
        toast.success('Certificate revoked', `${pending.cert.certificateNumber} will now fail public verification.`);
      } else {
        const c = await reissue.mutateAsync({ id: pending.cert.id, reason: reason.trim() });
        toast.success('Certificate reissued', `New certificate ${c.certificateNumber} issued to ${c.studentName}.`);
      }
      setPending(null);
      setReason('');
    } catch (e) {
      toast.error(pending.action === 'revoke' ? 'Could not revoke' : 'Could not reissue', getErrorMessage(e));
    }
  };

  const columns: Column<Certificate>[] = [
    { key: 'number', header: 'Certificate no.', render: (c) => <span className="font-mono text-xs font-semibold text-charcoal-900">{c.certificateNumber}</span> },
    {
      key: 'student',
      header: 'Student',
      render: (c) => (
        <Link to={`/admin/students/${c.studentId}`} className="font-medium text-charcoal-900 hover:text-rose-700">
          {c.studentName}
        </Link>
      ),
    },
    { key: 'course', header: 'Course', render: (c) => c.courseTitle, hideBelow: 'md' },
    { key: 'completion', header: 'Completed', render: (c) => <span className="whitespace-nowrap">{formatDate(c.completionDate)}</span>, hideBelow: 'lg' },
    { key: 'issued', header: 'Issued', render: (c) => <span className="whitespace-nowrap">{formatDate(c.issuedAt)}</span>, hideBelow: 'sm' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setPreview(c)} leftIcon={<Eye className="h-3.5 w-3.5" />}>
            Preview
          </Button>
          {c.status === 'issued' ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-700 hover:bg-red-50"
              onClick={() => {
                setReason('');
                setPending({ cert: c, action: 'revoke' });
              }}
              leftIcon={<ShieldX className="h-3.5 w-3.5" />}
            >
              Revoke
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setReason('');
                setPending({ cert: c, action: 'reissue' });
              }}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Reissue
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by certificate number, student or course…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'issued', label: 'Issued' },
              { value: 'revoked', label: 'Revoked' },
            ],
          },
          { key: 'courseId', label: 'Course', options: courses.data?.map((c) => ({ value: c.id, label: c.title })) ?? [] },
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
        rows={certificates.data?.items}
        rowKey={(c) => c.id}
        isLoading={certificates.isLoading || certificates.isFetching}
        error={certificates.error}
        onRetry={() => void certificates.refetch()}
        emptyTitle="No certificates found"
        emptyDescription="Issued certificates appear here. Check the Eligible students tab to issue new ones."
        pagination={certificates.data ? { page, pageSize: PAGE_SIZE, total: certificates.data.total, onPageChange: setPage } : undefined}
        caption="Issued certificates"
      />

      {preview ? (
        <Dialog
          open
          onClose={() => setPreview(null)}
          title="Certificate preview"
          description={preview.certificateNumber}
          size="xl"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Close
              </Button>
              <LinkButton to={`/verify/${encodeURIComponent(preview.certificateNumber)}`} variant="outline">
                Open public verification
              </LinkButton>
            </>
          }
        >
          <CertificatePreview certificate={preview} />
          <KeyValue
            className="mt-5 sm:grid-cols-3"
            items={[
              { label: 'Issued by', value: preview.issuedBy },
              { label: 'Issued at', value: formatDateTime(preview.issuedAt) },
              { label: 'Status', value: <StatusBadge status={preview.status} /> },
              ...(preview.revokedAt ? [{ label: 'Revoked at', value: formatDateTime(preview.revokedAt) }, { label: 'Revocation reason', value: preview.revokedReason ?? '—' }] : []),
            ]}
          />
        </Dialog>
      ) : null}

      <ConfirmationDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        variant={pending?.action === 'revoke' ? 'danger' : 'primary'}
        title={pending?.action === 'revoke' ? 'Revoke this certificate?' : 'Reissue this certificate?'}
        description={
          pending
            ? pending.action === 'revoke'
              ? `${pending.cert.certificateNumber} (${pending.cert.studentName}) will be marked revoked and public verification will report it as invalid.`
              : `A new certificate number will be issued to ${pending.cert.studentName} for "${pending.cert.courseTitle}". The backend re-checks that completion criteria are still met.`
            : undefined
        }
        confirmLabel={pending?.action === 'revoke' ? 'Revoke' : 'Reissue'}
        loading={revoke.isPending || reissue.isPending}
        disabled={reason.trim().length < 5}
      >
        <FormField label="Reason" htmlFor="cert-reason" hint="Required, at least 5 characters. Stored in the audit log." required>
          <Textarea id="cert-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} rows={3} />
        </FormField>
      </ConfirmationDialog>
    </>
  );
};

// ---------------------------------------------------------------------------
// Eligible students
// ---------------------------------------------------------------------------

const EligibleTab = () => {
  const toast = useToast();
  const eligible = useEligibleStudents();
  const { issue } = useCertificateMutations();
  const [issuing, setIssuing] = useState<EligibleStudent | null>(null);

  const confirm = async () => {
    if (!issuing) return;
    try {
      const c = await issue.mutateAsync({ studentId: issuing.studentId, courseId: issuing.courseId });
      toast.success('Certificate issued', `${c.certificateNumber} issued to ${c.studentName}.`);
      setIssuing(null);
    } catch (e) {
      toast.error('Could not issue certificate', getErrorMessage(e));
    }
  };

  const columns: Column<EligibleStudent>[] = [
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
    { key: 'course', header: 'Course', render: (s) => s.courseTitle },
    { key: 'completed', header: 'Completed', render: (s) => <span className="whitespace-nowrap">{formatDate(s.completedAt)}</span>, hideBelow: 'md' },
    {
      key: 'evidence',
      header: 'Evidence',
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone="info">Lessons {s.evidence.requiredLessonsCompleted}</Badge>
          {s.evidence.liveAttendancePercent !== null ? <Badge tone="gold">Attendance {s.evidence.liveAttendancePercent}%</Badge> : null}
          {s.evidence.assessmentPassed !== null ? <Badge tone={s.evidence.assessmentPassed ? 'success' : 'danger'}>Assessment {s.evidence.assessmentPassed ? 'passed' : 'not passed'}</Badge> : null}
        </div>
      ),
      hideBelow: 'sm',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <Button size="sm" onClick={() => setIssuing(s)} leftIcon={<Award className="h-3.5 w-3.5" />}>
          Issue certificate
        </Button>
      ),
    },
  ];

  return (
    <>
      <InlineAlert tone="info" className="mb-4">
        Eligibility shown here is a snapshot. The backend re-verifies completion criteria when a certificate is issued, so an issue request can still be rejected.
      </InlineAlert>
      <DataTable
        columns={columns}
        rows={eligible.data}
        rowKey={(s) => `${s.studentId}:${s.courseId}`}
        isLoading={eligible.isLoading}
        error={eligible.error}
        onRetry={() => void eligible.refetch()}
        emptyTitle="No students awaiting a certificate"
        emptyDescription="Students appear here once they meet a course's completion criteria and have no active certificate for it."
        caption="Eligible students"
      />
      <ConfirmationDialog
        open={issuing !== null}
        onClose={() => setIssuing(null)}
        onConfirm={confirm}
        title="Issue certificate?"
        description={issuing ? `A certificate of completion for "${issuing.courseTitle}" will be issued to ${issuing.studentName} and becomes publicly verifiable immediately.` : undefined}
        confirmLabel="Issue certificate"
        loading={issue.isPending}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AdminCertificatesPage = () => {
  const [tab, setTab] = useState('issued');
  const eligible = useEligibleStudents();
  return (
    <div>
      <PageHeader title="Certificates" description="Issue, preview, revoke and reissue certificates of completion. Every action is audited and reflected in public verification." />
      <Tabs
        className="mb-4 w-fit max-w-full"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'issued', label: 'Issued certificates' },
          { value: 'eligible', label: 'Eligible students', count: eligible.data?.length },
        ]}
      />
      {tab === 'issued' ? <IssuedTab /> : <EligibleTab />}
    </div>
  );
};

export default AdminCertificatesPage;
