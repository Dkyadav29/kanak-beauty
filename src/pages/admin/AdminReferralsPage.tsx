import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gift, Pencil, Percent, RotateCcw, Save, UserPlus, Wallet } from 'lucide-react';
import { useAdminReferrals, useCourseReferralMutations, useCourseReferralRules, useReferralConfig, useReferralStats, useUpdateReferralConfig } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { CourseReferralTerms, ReferralAdminRow, ReferralStatus, ReferralValueType } from '@/types';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, DashboardStatCard, DataTable, Dialog, ErrorState, FormField, InlineAlert, Input, LoadingSkeleton, PageHeader, SearchAndFilters, Select, StatusBadge, useToast, type Column } from '@/components/ui';

const configSchema = z.object({
  enabled: z.boolean(),
  referrerRewardAmount: z.coerce.number().int().min(0).max(100_000),
  refereeDiscountAmount: z.coerce.number().int().min(0).max(100_000),
  maxCreditPerOrder: z.coerce.number().int().min(0).max(100_000),
});
type ConfigValues = z.infer<typeof configSchema>;

const PAGE_SIZE = 10;

/** "20% (₹1,999.80)" or "₹500". Shows the amount at today's price, so a fixed discount is capped at the course price. */
const ruleLabel = (type: ReferralValueType, value: number, amount: number, currency: string) =>
  type === 'percent' ? `${value}% (${formatCurrency(amount, currency)})` : formatCurrency(amount, currency);

const ruleValue = (label: string) =>
  z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, `${label} cannot be negative`);

const courseRuleSchema = z
  .object({
    enabled: z.boolean(),
    referrerRewardType: z.enum(['fixed', 'percent']),
    referrerRewardValue: ruleValue('Reward'),
    refereeDiscountType: z.enum(['fixed', 'percent']),
    refereeDiscountValue: ruleValue('Discount'),
    maxCreditPerOrder: z.coerce.number().int('Whole amount').min(0).max(100_000),
  })
  .superRefine((v, ctx) => {
    for (const kind of ['referrerReward', 'refereeDiscount'] as const) {
      const value = v[`${kind}Value`];
      const path = [`${kind}Value`];
      if (v[`${kind}Type`] === 'percent') {
        if (value > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'A percentage must be 0 to 100' });
      } else if (!Number.isInteger(value) || value > 100_000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'Whole amount, 0 to 100000' });
      }
    }
  });
type CourseRuleValues = z.infer<typeof courseRuleSchema>;
const COURSE_RULE_FIELDS: Array<keyof CourseRuleValues> = ['enabled', 'referrerRewardType', 'referrerRewardValue', 'refereeDiscountType', 'refereeDiscountValue', 'maxCreditPerOrder'];

const CourseRuleDialog = ({ row, onClose }: { row: CourseReferralTerms | null; onClose: () => void }) => {
  const { save } = useCourseReferralMutations();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CourseRuleValues>({ resolver: zodResolver(courseRuleSchema) });
  const { register, watch, formState } = form;

  useEffect(() => {
    if (!row) return;
    setServerError(null);
    form.reset({
      enabled: row.enabled,
      referrerRewardType: row.referrerRewardType,
      referrerRewardValue: row.referrerRewardValue,
      refereeDiscountType: row.refereeDiscountType,
      refereeDiscountValue: row.refereeDiscountValue,
      maxCreditPerOrder: row.maxCreditPerOrder,
    });
  }, [row, form]);

  const submit = async (values: CourseRuleValues) => {
    if (!row) return;
    setServerError(null);
    try {
      await save.mutateAsync({ courseId: row.courseId, payload: values });
      toast.success('Course rules saved', row.courseTitle);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if ((COURSE_RULE_FIELDS as string[]).includes(field)) form.setError(field as keyof CourseRuleValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  const cur = row?.currency ?? 'INR';
  const unit = (type: ReferralValueType) => (type === 'percent' ? '%' : cur);
  const rewardType = watch('referrerRewardType');
  const discountType = watch('refereeDiscountType');
  const formId = 'course-referral-form';

  return (
    <Dialog
      open={!!row}
      onClose={onClose}
      size="lg"
      title={row ? `Refer & Earn · ${row.courseTitle}` : ''}
      description={row ? `Course price ${formatCurrency(row.price, cur)}. A percentage discount is taken off this price; a percentage reward is a share of what the friend pays after the discount.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>
            Save course rules
          </Button>
        </>
      }
    >
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}
        </InlineAlert>
      ) : null}
      <form id={formId} onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Checkbox
          id="cr-enabled"
          className="sm:col-span-2"
          label="Refer & Earn applies to this course"
          description="When off: no friend discount, no referrer reward and no wallet credit on this course."
          {...register('enabled')}
        />
        <FormField label="Friend's discount type" htmlFor="cr-dtype">
          <Select id="cr-dtype" {...register('refereeDiscountType')}>
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percent of price</option>
          </Select>
        </FormField>
        <FormField label={`Friend's first-purchase discount (${unit(discountType)})`} htmlFor="cr-dvalue" error={formState.errors.refereeDiscountValue?.message}>
          <Input id="cr-dvalue" type="number" min={0} step={discountType === 'percent' ? 0.5 : 50} invalid={!!formState.errors.refereeDiscountValue} {...register('refereeDiscountValue')} />
        </FormField>
        <FormField label="Referrer reward type" htmlFor="cr-rtype">
          <Select id="cr-rtype" {...register('referrerRewardType')}>
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percent of amount paid</option>
          </Select>
        </FormField>
        <FormField label={`Referrer reward (${unit(rewardType)})`} htmlFor="cr-rvalue" error={formState.errors.referrerRewardValue?.message}>
          <Input id="cr-rvalue" type="number" min={0} step={rewardType === 'percent' ? 0.5 : 50} invalid={!!formState.errors.referrerRewardValue} {...register('referrerRewardValue')} />
        </FormField>
        <FormField label={`Max wallet credit on this course (${cur})`} htmlFor="cr-credit" error={formState.errors.maxCreditPerOrder?.message} hint="0 = wallet credit cannot be used on this course." className="sm:col-span-2">
          <Input id="cr-credit" type="number" min={0} step={100} invalid={!!formState.errors.maxCreditPerOrder} {...register('maxCreditPerOrder')} />
        </FormField>
      </form>
    </Dialog>
  );
};

const CourseRulesCard = () => {
  const rows = useCourseReferralRules();
  const { reset } = useCourseReferralMutations();
  const toast = useToast();
  const [editing, setEditing] = useState<CourseReferralTerms | null>(null);

  const resetRow = async (r: CourseReferralTerms) => {
    try {
      await reset.mutateAsync(r.courseId);
      toast.success('Course uses the programme defaults again', r.courseTitle);
    } catch (e) {
      toast.error('Could not reset the course', getErrorMessage(e));
    }
  };

  const columns: Column<CourseReferralTerms>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (r) => (
        <div>
          <p className="font-medium text-charcoal-900">{r.courseTitle}</p>
          <p className="text-xs text-charcoal-500">
            {formatCurrency(r.price, r.currency)}
            {r.courseStatus !== 'published' ? ` · ${r.courseStatus}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'rules',
      header: 'Rules',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={r.enabled ? 'success' : 'neutral'} dot>
            {r.enabled ? 'On' : 'Off'}
          </Badge>
          <Badge tone={r.custom ? 'gold' : 'info'}>{r.custom ? 'Custom' : 'Default'}</Badge>
        </div>
      ),
    },
    { key: 'discount', header: 'Friend saves', render: (r) => (r.enabled ? ruleLabel(r.refereeDiscountType, r.refereeDiscountValue, r.refereeDiscountAmount, r.currency) : '—'), hideBelow: 'sm' },
    { key: 'reward', header: 'Referrer earns', render: (r) => (r.enabled ? ruleLabel(r.referrerRewardType, r.referrerRewardValue, r.referrerRewardAmount, r.currency) : '—'), hideBelow: 'md' },
    { key: 'credit', header: 'Max credit', render: (r) => (r.enabled ? formatCurrency(r.maxCreditPerOrder, r.currency) : '—'), hideBelow: 'lg' },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(r)}>
            Edit
          </Button>
          {r.custom ? (
            <Button size="icon" variant="ghost" aria-label={`Reset ${r.courseTitle} to defaults`} disabled={reset.isPending} onClick={() => void resetRow(r)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Course rules"
        description="Set the friend's discount, the referrer's reward and the wallet limit per course, as a fixed amount or a percentage. Courses marked Default follow the programme settings."
      />
      <CardBody className="p-0 sm:p-0">
        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={columns}
          rows={rows.data}
          rowKey={(r) => r.courseId}
          isLoading={rows.isLoading}
          error={rows.error}
          onRetry={() => void rows.refetch()}
          onRowClick={(r) => setEditing(r)}
          emptyTitle="No courses yet"
          emptyDescription="Create a course first; its Refer & Earn rules can then be set here."
          caption="Refer & Earn rules per course"
        />
      </CardBody>
      <CourseRuleDialog row={editing} onClose={() => setEditing(null)} />
    </Card>
  );
};

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
          <CardHeader title="Programme settings" description="The master switch, plus the defaults for courses without their own rules. Changes apply to new orders and are audited." />
          <CardBody>
            {config.isLoading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : config.error ? (
              <ErrorState error={config.error} onRetry={() => void config.refetch()} compact />
            ) : (
              <form onSubmit={form.handleSubmit(save)} className="space-y-4" noValidate>
                <Checkbox id="enabled" label="Programme enabled" description="When off, codes are rejected and no new rewards are credited on any course." {...form.register('enabled')} />
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Defaults for courses without their own rules</p>
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

      <CourseRulesCard />
    </div>
  );
};

export default AdminReferralsPage;
