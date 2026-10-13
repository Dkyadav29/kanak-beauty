import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gift, Percent, Save, UserPlus, Wallet } from 'lucide-react';
import { useAdminReferrals, useReferralConfig, useReferralStats, useUpdateReferralConfig } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { ReferralAdminRow, ReferralStatus } from '@/types';
import { Button, Card, CardBody, CardHeader, Checkbox, DashboardStatCard, DataTable, ErrorState, FormField, InlineAlert, Input, LoadingSkeleton, PageHeader, SearchAndFilters, StatusBadge, useToast, type Column } from '@/components/ui';

const configSchema = z.object({
  enabled: z.boolean(),
  referrerRewardAmount: z.coerce.number().int().min(0).max(100_000),
  refereeDiscountAmount: z.coerce.number().int().min(0).max(100_000),
  maxCreditPerOrder: z.coerce.number().int().min(0).max(100_000),
});
type ConfigValues = z.infer<typeof configSchema>;

const PAGE_SIZE = 10;

const AdminReferralsPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReferralStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const referrals = useAdminReferrals({ search: search || undefined, status: status === 'all' ? undefined : status, page, pageSize: PAGE_SIZE });
  const stats = useReferralStats();
  const config = useReferralConfig();
  const update = useUpdateReferralConfig();
  const toast = useToast();

  const form = useForm<ConfigValues>({ resolver: zodResolver(configSchema) });
  useEffect(() => {
    if (config.data) form.reset({ enabled: config.data.enabled, referrerRewardAmount: config.data.referrerRewardAmount, refereeDiscountAmount: config.data.refereeDiscountAmount, maxCreditPerOrder: config.data.maxCreditPerOrder });
  }, [config.data, form]);

  const save = async (values: ConfigValues) => {
    try {
      await update.mutateAsync(values);
      toast.success('Referral programme updated');
    } catch (e) {
      toast.error('Could not save programme settings', getErrorMessage(e));
    }
  };

  const cur = stats.data?.currency ?? 'INR';
  const columns: Column<ReferralAdminRow>[] = [
    {
      key: 'referrer',
      header: 'Referrer',
      render: (r) => (
        <div>
          <Link to={`/admin/students/${r.referrerId}`} className="font-medium hover:text-rose-700">
            {r.referrerName}
          </Link>
          <p className="font-mono text-xs text-charcoal-500">{r.referralCode}</p>
        </div>
      ),
    },
    {
      key: 'referee',
      header: 'Referred friend',
      render: (r) => (
        <div>
          <Link to={`/admin/students/${r.refereeId}`} className="font-medium hover:text-rose-700">
            {r.refereeName}
          </Link>
          <p className="text-xs text-charcoal-500">{r.refereeEmail}</p>
        </div>
      ),
    },
    { key: 'joined', header: 'Signed up', render: (r) => formatDateTime(r.createdAt), hideBelow: 'lg' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'signed_up' ? 'Signed up' : r.status === 'rewarded' ? 'Rewarded' : 'Cancelled'} /> },
    { key: 'course', header: 'First course', render: (r) => r.courseTitle ?? '—', hideBelow: 'xl' },
    { key: 'converted', header: 'Converted', render: (r) => formatDateTime(r.convertedAt), hideBelow: 'lg' },
    { key: 'reward', header: 'Reward', align: 'right', render: (r) => (r.rewardAmount ? formatCurrency(r.rewardAmount, cur) : '—') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Refer & Earn" description="Referral activity, wallet liabilities and programme settings. Rewards are credited automatically by the payment webhook and reversed on refund." />

      {stats.isLoading ? (
        <LoadingSkeleton variant="stats" count={4} />
      ) : stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} compact />
      ) : stats.data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardStatCard label="Referrals" value={stats.data.totalReferrals} icon={<UserPlus className="h-5 w-5" />} hint={`${stats.data.converted} converted · ${stats.data.conversionRate}%`} />
          <DashboardStatCard label="Rewards credited" value={formatCurrency(stats.data.rewardsCredited, cur)} icon={<Gift className="h-5 w-5" />} tone="gold" />
          <DashboardStatCard label="Credit redeemed" value={formatCurrency(stats.data.rewardsRedeemed, cur)} icon={<Percent className="h-5 w-5" />} tone="success" />
          <DashboardStatCard label="Outstanding balance" value={formatCurrency(stats.data.outstandingBalance, cur)} icon={<Wallet className="h-5 w-5" />} tone="info" hint="Unused wallet credit across students" />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SearchAndFilters
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Search referrer, friend or code…"
            filters={[{ key: 'status', label: 'Status', options: [{ value: 'signed_up', label: 'Signed up' }, { value: 'rewarded', label: 'Rewarded' }, { value: 'cancelled', label: 'Cancelled' }] }]}
            values={{ status }}
            onFilterChange={(_, v) => {
              setStatus(v as ReferralStatus | 'all');
              setPage(1);
            }}
            onReset={() => {
              setSearch('');
              setStatus('all');
              setPage(1);
            }}
          />
          <DataTable
            columns={columns}
            rows={referrals.data?.items}
            rowKey={(r) => r.id}
            isLoading={referrals.isLoading}
            error={referrals.error}
            onRetry={() => void referrals.refetch()}
            emptyTitle="No referrals found"
            emptyDescription="Referrals appear when a new student registers with another student's code."
            pagination={referrals.data ? { page, pageSize: PAGE_SIZE, total: referrals.data.total, onPageChange: setPage } : undefined}
            caption="Referrals"
          />
        </div>

        <Card className="self-start">
          <CardHeader title="Programme settings" description="Changes apply to new sign-ups and new orders. Every change is audited." />
          <CardBody>
            {config.isLoading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : config.error ? (
              <ErrorState error={config.error} onRetry={() => void config.refetch()} compact />
            ) : (
              <form onSubmit={form.handleSubmit(save)} className="space-y-4" noValidate>
                <Checkbox id="enabled" label="Programme enabled" description="When off, codes are rejected and no new rewards are credited." {...form.register('enabled')} />
                <FormField label={`Referrer reward (${cur})`} htmlFor="referrerRewardAmount" error={form.formState.errors.referrerRewardAmount?.message} hint="Credited to the referrer's wallet on the friend's first confirmed payment.">
                  <Input id="referrerRewardAmount" type="number" min={0} step={50} {...form.register('referrerRewardAmount')} />
                </FormField>
                <FormField label={`Friend's first-purchase discount (${cur})`} htmlFor="refereeDiscountAmount" error={form.formState.errors.refereeDiscountAmount?.message}>
                  <Input id="refereeDiscountAmount" type="number" min={0} step={50} {...form.register('refereeDiscountAmount')} />
                </FormField>
                <FormField label={`Max wallet credit per order (${cur})`} htmlFor="maxCreditPerOrder" error={form.formState.errors.maxCreditPerOrder?.message}>
                  <Input id="maxCreditPerOrder" type="number" min={0} step={100} {...form.register('maxCreditPerOrder')} />
                </FormField>
                <Button type="submit" className="w-full" loading={update.isPending} leftIcon={<Save className="h-4 w-4" />}>
                  Save settings
                </Button>
                <InlineAlert tone="info">Wallet balances are a liability. Reducing the per-order limit does not remove credit already earned.</InlineAlert>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default AdminReferralsPage;
