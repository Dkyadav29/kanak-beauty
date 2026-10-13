import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Undo2 } from 'lucide-react';
import { useAdminPayments, usePaymentMutations } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDateTime, titleCase } from '@/lib/utils';
import type { PaymentFilters, PaymentStatus, PaymentTransaction } from '@/types';
import { PermissionGate } from '@/components/auth/guards';
import { Button, ConfirmationDialog, DataTable, FormField, InlineAlert, PageHeader, SearchAndFilters, StatusBadge, Textarea, useToast, type Column } from '@/components/ui';

const PAGE_SIZE = 10;
const STATUSES: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded', 'cancelled'];
const clean = (v?: string) => (v && v !== 'all' ? v : undefined);

const AdminPaymentsPage = () => {
  const toast = useToast();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: params.get('status') ?? 'all' });
  const [page, setPage] = useState(1);
  const [reconciling, setReconciling] = useState<PaymentTransaction | null>(null);
  const [refunding, setRefunding] = useState<PaymentTransaction | null>(null);
  const [reason, setReason] = useState('');
  const { reconcile, refund } = usePaymentMutations();

  const query = useMemo(
    () => ({ search: search || undefined, status: clean(filters.status) as PaymentFilters['status'], from: filters.from || undefined, to: filters.to || undefined, page, pageSize: PAGE_SIZE }),
    [search, filters, page],
  );
  const payments = useAdminPayments(query);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const summary = useMemo(() => {
    const items = payments.data?.items ?? [];
    return STATUSES.map((s) => ({ status: s, count: items.filter((p) => p.status === s).length, amount: items.filter((p) => p.status === s).reduce((n, p) => n + p.amount, 0) }));
  }, [payments.data]);

  const confirmReconcile = async () => {
    if (!reconciling) return;
    try {
      const res = await reconcile.mutateAsync(reconciling.id);
      toast.success(res.changed ? 'Payment status updated from gateway' : 'Payment already in sync', `Gateway reports "${titleCase(res.gatewayStatus)}" for ${reconciling.orderId}.${res.changed ? '' : ' No change was made.'}`);
      setReconciling(null);
    } catch (e) {
      toast.error('Reconciliation failed', getErrorMessage(e));
    }
  };

  const confirmRefund = async () => {
    if (!refunding) return;
    try {
      await refund.mutateAsync({ id: refunding.id, reason: reason.trim() });
      toast.success('Refund recorded', `${refunding.orderId} refunded. Course access for this purchase has been revoked.`);
      setRefunding(null);
      setReason('');
    } catch (e) {
      toast.error('Could not refund', getErrorMessage(e));
    }
  };

  const columns: Column<PaymentTransaction>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (p) => (
        <div>
          <p className="font-mono text-xs font-semibold text-charcoal-900">{p.orderId}</p>
          {p.gatewayReference ? <p className="font-mono text-[11px] text-charcoal-500">{p.gatewayReference}</p> : null}
        </div>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (p) => (
        <Link to={`/admin/students/${p.studentId}`} className="font-medium text-charcoal-900 hover:text-rose-700">
          {p.studentName}
        </Link>
      ),
    },
    { key: 'course', header: 'Course', render: (p) => p.courseTitle, hideBelow: 'lg' },
    { key: 'amount', header: 'Amount', render: (p) => <span className="font-semibold">{formatCurrency(p.amount, p.currency)}</span>, align: 'right' },
    { key: 'method', header: 'Method', render: (p) => p.method ?? '—', hideBelow: 'xl' },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={p.status} />
          {p.refundStatus !== 'none' ? <StatusBadge status={p.refundStatus} label={`Refund ${p.refundStatus}`} /> : null}
        </div>
      ),
    },
    { key: 'created', header: 'Created', render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span>, hideBelow: 'md' },
    { key: 'paid', header: 'Paid', render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.paidAt)}</span>, hideBelow: 'xl' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <PermissionGate permission="payments:reconcile">
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setReconciling(p)} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              Reconcile
            </Button>
            {p.status === 'paid' ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700 hover:bg-red-50"
                onClick={() => {
                  setReason('');
                  setRefunding(p);
                }}
                leftIcon={<Undo2 className="h-3.5 w-3.5" />}
              >
                Refund
              </Button>
            ) : null}
          </div>
        </PermissionGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Payments" description="Every order placed with the academy. Statuses come from the payment gateway; admins can re-verify (reconcile) or refund, never mark a payment as paid." />
      <InlineAlert tone="info" className="mb-4">
        A payment becomes <strong>paid</strong> only when the gateway confirms it. Reconcile re-queries the gateway for the authoritative status; refunds revoke the linked course access.
      </InlineAlert>
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by order ID, student, course or gateway reference…"
        filters={[
          { key: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: titleCase(s) })) },
          { key: 'from', label: 'From date', type: 'date' },
          { key: 'to', label: 'To date', type: 'date' },
        ]}
        values={filters}
        onFilterChange={onFilter}
        onReset={() => {
          setSearch('');
          setFilters({ status: 'all' });
          setPage(1);
        }}
        className="mb-4"
      />

      {payments.data && payments.data.items.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summary.map((s) => (
            <div key={s.status} className="card flex items-center justify-between gap-2 px-4 py-3">
              <div>
                <StatusBadge status={s.status} />
                <p className="mt-1.5 text-xs text-charcoal-500">{formatCurrency(s.amount)}</p>
              </div>
              <p className="font-display text-2xl font-semibold text-charcoal-900">{s.count}</p>
            </div>
          ))}
          <p className="col-span-full -mt-1 text-xs text-charcoal-500">Counts reflect the current page only.</p>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={payments.data?.items}
        rowKey={(p) => p.id}
        isLoading={payments.isLoading || payments.isFetching}
        error={payments.error}
        onRetry={() => void payments.refetch()}
        emptyTitle="No payments found"
        emptyDescription="Try a different search, status or date range."
        pagination={payments.data ? { page, pageSize: PAGE_SIZE, total: payments.data.total, onPageChange: setPage } : undefined}
        caption="Payments"
      />

      <ConfirmationDialog
        open={reconciling !== null}
        onClose={() => setReconciling(null)}
        onConfirm={confirmReconcile}
        title="Reconcile with the gateway?"
        description={reconciling ? `This re-verifies ${reconciling.orderId} (currently ${reconciling.status}) against the payment gateway's records. If the gateway reports a different status, the record is updated and the change is audited. Nothing is marked as paid without gateway confirmation.` : undefined}
        confirmLabel="Re-verify"
        loading={reconcile.isPending}
      />

      <ConfirmationDialog
        open={refunding !== null}
        onClose={() => setRefunding(null)}
        onConfirm={confirmRefund}
        variant="danger"
        title="Refund this payment?"
        description={refunding ? `${formatCurrency(refunding.amount, refunding.currency)} for "${refunding.courseTitle}" (${refunding.orderId}) will be refunded to ${refunding.studentName}. Their access from this purchase is revoked and any batch seat is released.` : undefined}
        confirmLabel="Refund"
        loading={refund.isPending}
        disabled={reason.trim().length < 5}
      >
        <FormField label="Reason" htmlFor="refund-reason" hint="Required, at least 5 characters. Stored in the audit log." required>
          <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} rows={3} />
        </FormField>
      </ConfirmationDialog>
    </div>
  );
};

export default AdminPaymentsPage;
