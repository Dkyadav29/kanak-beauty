import { useState } from 'react';
import { Check, Copy, Gift, Link2, MessageCircle, Share2, Sparkles, UserPlus, Wallet } from 'lucide-react';
import { useReferralSummary } from '@/hooks/useStudent';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Referral, ReferralReward } from '@/types';
import { Badge, Button, Card, CardBody, CardHeader, DashboardStatCard, DataTable, ErrorState, InlineAlert, LoadingSkeleton, PageHeader, StatusBadge, Tabs, useToast, type Column } from '@/components/ui';

const ReferEarnPage = () => {
  const summary = useReferralSummary();
  const toast = useToast();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [tab, setTab] = useState<'referrals' | 'wallet'>('referrals');

  if (summary.isLoading) return <LoadingSkeleton variant="page" />;
  if (summary.error || !summary.data) return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  const s = summary.data;
  const cur = s.program.currency;

  const copy = async (text: string, what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Could not copy', 'Please copy the text manually.');
    }
  };

  const shareText = `Join me at Kanak Beauty Academy! Use my referral code ${s.referralCode} and get ${formatCurrency(s.program.refereeDiscountAmount, cur)} off your first course: ${s.referralLink}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Kanak Beauty Academy', text: shareText, url: s.referralLink });
      else await copy(shareText, 'link');
    } catch {
      /* cancelled */
    }
  };

  const referralColumns: Column<Referral>[] = [
    {
      key: 'friend',
      header: 'Friend',
      render: (r) => (
        <div>
          <p className="font-medium">{r.refereeName}</p>
          <p className="text-xs text-charcoal-500">{r.refereeEmail.replace(/^(.{2}).+(@.+)$/, '$1•••$2')}</p>
        </div>
      ),
    },
    { key: 'joined', header: 'Joined', render: (r) => formatDateTime(r.createdAt), hideBelow: 'md' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'signed_up' ? 'Signed up' : r.status === 'rewarded' ? 'Enrolled · rewarded' : 'Cancelled'} /> },
    { key: 'course', header: 'First course', render: (r) => r.courseTitle ?? <span className="text-charcoal-500">Not enrolled yet</span>, hideBelow: 'lg' },
    { key: 'reward', header: 'Reward', align: 'right', render: (r) => (r.rewardAmount ? <span className="font-semibold text-emerald-700">+{formatCurrency(r.rewardAmount, cur)}</span> : '—') },
  ];

  const rewardColumns: Column<ReferralReward>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'note', header: 'Details', render: (r) => <span className="text-charcoal-700">{r.note}</span> },
    { key: 'status', header: 'Type', render: (r) => <StatusBadge status={r.status} />, hideBelow: 'md' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className={`font-semibold ${r.amount >= 0 ? 'text-emerald-700' : 'text-charcoal-800'}`}>{r.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(r.amount), cur)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Refer & Earn" description="Invite friends to Kanak Beauty Academy. They save on their first course, and you earn wallet credit when they enroll." />

      {!s.program.enabled ? <InlineAlert tone="warning">The referral programme is currently paused. Existing credit can still be used at checkout.</InlineAlert> : null}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-charcoal-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/30 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">Your invitation</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Give {formatCurrency(s.program.refereeDiscountAmount, cur)}, get {formatCurrency(s.program.referrerRewardAmount, cur)}.
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/80">
              Friends who sign up with your code get {formatCurrency(s.program.refereeDiscountAmount, cur)} off their first course. When their payment is confirmed, {formatCurrency(s.program.referrerRewardAmount, cur)} is credited to your wallet to use on your next course.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-[auto_1fr]">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Referral code</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold tracking-wider">{s.referralCode}</span>
                  <button type="button" onClick={() => void copy(s.referralCode, 'code')} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Copy referral code">
                    {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="min-w-0 rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Referral link</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="truncate font-mono text-sm">{s.referralLink}</span>
                  <button type="button" onClick={() => void copy(s.referralLink, 'link')} className="shrink-0 rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Copy referral link">
                    {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="gold" onClick={() => void share()} leftIcon={<Share2 className="h-4 w-4" />}>
                Share invitation
              </Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold text-white hover:border-white"
              >
                <MessageCircle className="h-4 w-4" /> Share on WhatsApp
              </a>
            </div>
          </div>
          <ol className="grid gap-3 text-sm">
            {[
              { icon: Share2, title: 'Share your code or link', text: 'Send it to friends who want to start a beauty career.' },
              { icon: UserPlus, title: 'They sign up and save', text: `Your friend enters the code at registration and gets ${formatCurrency(s.program.refereeDiscountAmount, cur)} off their first course.` },
              { icon: Wallet, title: 'You earn wallet credit', text: `Once their payment is confirmed, ${formatCurrency(s.program.referrerRewardAmount, cur)} lands in your wallet. Up to ${formatCurrency(s.program.maxCreditPerOrder, cur)} can be applied per order.` },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400 text-charcoal-900">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-white/75">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard label="Friends signed up" value={s.stats.signedUp} icon={<UserPlus className="h-5 w-5" />} />
        <DashboardStatCard label="Friends enrolled" value={s.stats.converted} icon={<Sparkles className="h-5 w-5" />} tone="success" />
        <DashboardStatCard label="Total earned" value={formatCurrency(s.stats.totalEarned, cur)} icon={<Gift className="h-5 w-5" />} tone="gold" />
        <DashboardStatCard label="Wallet balance" value={formatCurrency(s.stats.walletBalance, cur)} icon={<Wallet className="h-5 w-5" />} tone="info" hint="Apply it at checkout" />
      </section>

      <Card>
        <CardHeader
          title="Activity"
          description="Rewards are credited by the academy only after a referred friend's payment is confirmed. Refunds reverse the reward."
          action={<Tabs value={tab} onChange={(v) => setTab(v as 'referrals' | 'wallet')} items={[{ value: 'referrals', label: 'Referrals', count: s.referrals.length }, { value: 'wallet', label: 'Wallet ledger', count: s.rewards.length }]} />}
        />
        <CardBody className="p-0 sm:p-0">
          {tab === 'referrals' ? (
            <DataTable
              className="rounded-none border-0 shadow-none"
              columns={referralColumns}
              rows={s.referrals}
              rowKey={(r) => r.id}
              emptyTitle="No referrals yet"
              emptyDescription="Share your code to start earning. Your friends' progress will appear here."
              caption="Referrals"
            />
          ) : (
            <DataTable
              className="rounded-none border-0 shadow-none"
              columns={rewardColumns}
              rows={s.rewards}
              rowKey={(r) => r.id}
              emptyTitle="No wallet activity yet"
              emptyDescription="Credits appear here when a referred friend enrolls."
              caption="Wallet ledger"
              footer={
                <div className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-500">Available balance</span>
                  <Badge tone="gold" className="text-sm">
                    {formatCurrency(s.stats.walletBalance, cur)}
                  </Badge>
                </div>
              }
            />
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-charcoal-500">
        Programme terms: rewards apply to a friend's first confirmed course payment only. Self-referrals and duplicate accounts are not eligible. Credit has no cash value and is applied at checkout up to the per-order limit.
      </p>
    </div>
  );
};

export default ReferEarnPage;
