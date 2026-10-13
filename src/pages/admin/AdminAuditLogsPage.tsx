import { useCallback, useMemo, useState } from 'react';
import { useAuditLogs } from '@/hooks/useAdmin';
import { formatDateTime, titleCase } from '@/lib/utils';
import type { AuditLog } from '@/types';
import { Badge, DataTable, PageHeader, SearchAndFilters, type BadgeTone, type Column } from '@/components/ui';

const PAGE_SIZE = 10;
const ENTITY_TYPES = ['course', 'batch', 'live_session', 'enrollment', 'payment', 'certificate'];

const actionTone = (action: string): BadgeTone => {
  const verb = action.split('.')[1] ?? '';
  if (/revoke|refund|cancel|withdraw|suspend/.test(verb)) return 'danger';
  if (/issue|publish|grant|create|active|reissue/.test(verb)) return 'success';
  if (/archive|unpublish/.test(verb)) return 'neutral';
  if (/reconcile|attendance/.test(verb)) return 'info';
  return 'rose';
};

const AdminAuditLogsPage = () => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({ search: search || undefined, entityType: filters.entityType && filters.entityType !== 'all' ? filters.entityType : undefined, from: filters.from || undefined, to: filters.to || undefined, page, pageSize: PAGE_SIZE }),
    [search, filters, page],
  );
  const logs = useAuditLogs(query);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const onFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'Time', render: (l) => <span className="whitespace-nowrap text-charcoal-700">{formatDateTime(l.at)}</span> },
    { key: 'actor', header: 'Actor', render: (l) => <span className="font-medium text-charcoal-900">{l.actorName}</span>, hideBelow: 'sm' },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <Badge tone={actionTone(l.action)} className="font-mono font-medium normal-case">
          {l.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (l) => (
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">{titleCase(l.entityType)}</p>
          <p className="max-w-[160px] truncate font-mono text-xs text-charcoal-700" title={l.entityId}>
            {l.entityId}
          </p>
        </div>
      ),
      hideBelow: 'md',
    },
    { key: 'details', header: 'Details', render: (l) => <span className="text-charcoal-800">{l.details}</span>, className: 'min-w-[240px] max-w-xl whitespace-normal' },
  ];

  return (
    <div>
      <PageHeader title="Audit logs" description="An immutable trail of every administrative action: who did what, to which record, and when. Entries are written by the backend and cannot be edited." />
      <SearchAndFilters
        search={search}
        onSearchChange={onSearch}
        searchPlaceholder="Search by action, actor, entity ID or details…"
        filters={[
          { key: 'entityType', label: 'Entity', options: ENTITY_TYPES.map((t) => ({ value: t, label: titleCase(t) })) },
          { key: 'from', label: 'From date', type: 'date' },
          { key: 'to', label: 'To date', type: 'date' },
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
        rows={logs.data?.items}
        rowKey={(l) => l.id}
        isLoading={logs.isLoading || logs.isFetching}
        error={logs.error}
        onRetry={() => void logs.refetch()}
        emptyTitle="No audit entries"
        emptyDescription="Administrative actions will be recorded here as they happen."
        pagination={logs.data ? { page, pageSize: PAGE_SIZE, total: logs.data.total, onPageChange: setPage } : undefined}
        caption="Audit logs"
      />
    </div>
  );
};

export default AdminAuditLogsPage;
