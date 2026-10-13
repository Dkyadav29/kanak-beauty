import { useMemo, useState } from 'react';
import { Award, BookOpen, CalendarClock, CheckCircle2, CreditCard, GraduationCap, Hourglass, Layers, Radio, Users, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdminAnalytics, useAdminOverview } from '@/hooks/useAdmin';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DateRangeFilter } from '@/types';
import { Button, Card, CardBody, CardHeader, DashboardStatCard, EmptyState, ErrorState, FormField, Input, LoadingSkeleton, PageHeader } from '@/components/ui';

const COLORS = { rose: '#c2456b', gold: '#c9a96e', charcoal: '#5b5b63', grid: '#f1e9db' };
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const tooltipStyle = { borderRadius: 12, border: `1px solid ${COLORS.grid}`, fontSize: 12, color: COLORS.charcoal, boxShadow: '0 8px 24px rgba(43,43,48,0.08)' };
const truncate = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const AdminDashboardPage = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const range = useMemo<DateRangeFilter>(() => ({ from: from || undefined, to: to || undefined }), [from, to]);
  const overview = useAdminOverview(range);
  const analytics = useAdminAnalytics(range);
  const stats = overview.data;

  return (
    <div>
      <PageHeader
        title="Academy overview"
        description={stats ? `Key numbers for ${formatDate(stats.range.from)} – ${formatDate(stats.range.to)}. Payment, enrollment and certificate counts follow the selected range.` : 'Key numbers across students, courses, batches and payments.'}
        actions={
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => e.preventDefault()}>
            <FormField label="From" htmlFor="range-from">
              <Input id="range-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </FormField>
            <FormField label="To" htmlFor="range-to">
              <Input id="range-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </FormField>
            {from || to ? (
              <Button
                variant="ghost"
                size="sm"
                className="mb-1"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                leftIcon={<X className="h-4 w-4" />}
              >
                All time
              </Button>
            ) : null}
          </form>
        }
      />

      {overview.isLoading ? (
        <LoadingSkeleton variant="stats" count={10} />
      ) : overview.error ? (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} compact />
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <DashboardStatCard label="Total students" value={stats.totalStudents} icon={<Users className="h-5 w-5" />} to="/admin/students" />
          <DashboardStatCard label="Active students" value={stats.activeStudents} icon={<GraduationCap className="h-5 w-5" />} tone="success" hint="With an active, incomplete enrollment" to="/admin/students?enrollmentStatus=active" />
          <DashboardStatCard label="Total courses" value={stats.totalCourses} icon={<BookOpen className="h-5 w-5" />} tone="gold" hint={`${stats.publishedCourses} published`} to="/admin/courses" />
          <DashboardStatCard label="Active batches" value={stats.activeBatches} icon={<Layers className="h-5 w-5" />} tone="info" to="/admin/batches" />
          <DashboardStatCard label="Upcoming live classes" value={stats.upcomingLiveClasses} icon={<Radio className="h-5 w-5" />} to="/admin/live-sessions" />
          <DashboardStatCard label="Paid enrollments" value={stats.paidEnrollments} icon={<CalendarClock className="h-5 w-5" />} tone="success" hint="Purchased, access active" to="/admin/enrollments" />
          <DashboardStatCard label="Payments received" value={formatCurrency(stats.totalPaymentsReceived, stats.currency)} icon={<CreditCard className="h-5 w-5" />} tone="gold" to="/admin/payments?status=paid" />
          <DashboardStatCard label="Pending payments" value={stats.pendingPayments} icon={<Hourglass className="h-5 w-5" />} tone="neutral" hint={`${formatCurrency(stats.pendingPaymentAmount, stats.currency)} outstanding`} to="/admin/payments?status=pending" />
          <DashboardStatCard label="Completed courses" value={stats.completedCourses} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" to="/admin/enrollments" />
          <DashboardStatCard label="Certificates issued" value={stats.certificatesIssued} icon={<Award className="h-5 w-5" />} to="/admin/certificates" />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by month" description="Paid transactions, last six months" />
          <CardBody>
            {analytics.isLoading ? (
              <LoadingSkeleton variant="page" />
            ) : analytics.error ? (
              <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} compact />
            ) : analytics.data && analytics.data.revenueByMonth.some((p) => p.revenue > 0) ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.data.revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.charcoal, fontSize: 12 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                    <YAxis tick={{ fill: COLORS.charcoal, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => compact.format(v)} width={56} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: COLORS.gold, strokeWidth: 1 }} formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.rose} strokeWidth={2} fill={COLORS.rose} fillOpacity={0.12} dot={{ r: 3, fill: COLORS.rose, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No revenue yet" description="Paid transactions will appear here month by month." compact />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Enrollments by course" description="Enrollments with access versus completions" />
          <CardBody>
            {analytics.isLoading ? (
              <LoadingSkeleton variant="page" />
            ) : analytics.error ? (
              <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} compact />
            ) : analytics.data && analytics.data.enrollmentsByCourse.length > 0 ? (
              <div className="w-full" style={{ height: Math.max(288, analytics.data.enrollmentsByCourse.length * 56 + 48) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.data.enrollmentsByCourse} layout="vertical" margin={{ top: 8, right: 32, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
                    <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: COLORS.charcoal, fontSize: 12 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                    <YAxis type="category" dataKey="courseTitle" width={150} tick={{ fill: COLORS.charcoal, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncate(v)} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: COLORS.grid, fillOpacity: 0.6 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: COLORS.charcoal }} />
                    <Bar dataKey="enrollments" name="Enrollments" fill={COLORS.rose} radius={[0, 4, 4, 0]} maxBarSize={18}>
                      <LabelList dataKey="enrollments" position="right" style={{ fill: COLORS.charcoal, fontSize: 11 }} />
                    </Bar>
                    <Bar dataKey="completions" name="Completions" fill={COLORS.gold} stroke={COLORS.gold} radius={[0, 4, 4, 0]} maxBarSize={18}>
                      <LabelList dataKey="completions" position="right" style={{ fill: COLORS.charcoal, fontSize: 11 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No enrollment data" description="Publish a course and enroll students to see this chart." compact />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
