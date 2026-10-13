import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CheckCircle2, Gift, PlayCircle, Radio, Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useStudentDashboard } from '@/hooks/useStudent';
import { formatDate } from '@/lib/utils';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { CourseProgressCard } from '@/components/shared/CourseProgressCard';
import { Avatar, DashboardStatCard, EmptyState, ErrorState, ImageWithFallback, LinkButton, LoadingSkeleton, ProgressBar, StatusBadge } from '@/components/ui';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const StudentDashboardPage = () => {
  const { user } = useAuth();
  const dashboard = useStudentDashboard();

  if (dashboard.isLoading) return <LoadingSkeleton variant="page" />;
  if (dashboard.error || !dashboard.data) return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data;
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-charcoal-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-400/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="xl" className="ring-4 ring-white/20" />
            <div>
              <p className="text-sm text-white/70">{greeting()}</p>
              <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">Welcome back, {firstName}!</h1>
              <p className="mt-1 text-sm text-white/80">
                {d.stats.active > 0 ? `You have ${d.stats.active} active course${d.stats.active === 1 ? '' : 's'}. Keep the momentum going.` : d.stats.totalEnrolled > 0 ? 'All your courses are complete. Ready for your next skill?' : 'Start your first course today.'}
              </p>
            </div>
          </div>
          {d.continueLearning ? (
            <Link to={`/student/courses/${d.continueLearning.courseId}/learn`} className="group flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur transition-colors hover:bg-white/15">
              <ImageWithFallback src={d.continueLearning.thumbnailUrl} alt="" className="h-16 w-24 rounded-xl object-cover" fallbackLabel="" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">Continue learning</p>
                <p className="truncate font-semibold">{d.continueLearning.title}</p>
                <ProgressBar value={d.continueLearning.progressPercent} tone="gold" size="sm" className="mt-2 w-40" />
              </div>
              <PlayCircle className="h-8 w-8 shrink-0 text-white transition-transform group-hover:scale-110" />
            </Link>
          ) : (
            <LinkButton to="/courses" variant="gold" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Explore courses
            </LinkButton>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <DashboardStatCard label="Total Enrolled" value={d.stats.totalEnrolled} icon={<BookOpen className="h-5 w-5" />} to="/student/courses" />
        <DashboardStatCard label="Active Courses" value={d.stats.active} icon={<Sparkles className="h-5 w-5" />} tone="gold" to="/student/courses?filter=in_progress" />
        <DashboardStatCard label="Upcoming Live Classes" value={d.stats.upcomingLiveClasses} icon={<Radio className="h-5 w-5" />} tone="info" to="/student/live-classes" />
        <DashboardStatCard label="Completed" value={d.stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" to="/student/courses?filter=completed" />
        <DashboardStatCard label="Certificates" value={d.stats.certificates} icon={<Award className="h-5 w-5" />} tone="gold" to="/student/certificates" />
      </section>

      <Link to="/student/refer" className="group flex flex-col gap-4 rounded-3xl border border-gold-200 bg-gradient-to-r from-gold-50 to-ivory-100 p-5 transition-shadow hover:shadow-lift sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500 text-charcoal-900">
          <Gift className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="font-display text-xl font-semibold text-charcoal-900">Refer & Earn</p>
          <p className="text-sm text-charcoal-700">Invite friends to Kanak. They save on their first course and you earn wallet credit when they enroll.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 group-hover:underline">
          Get my referral link <ArrowRight className="h-4 w-4" />
        </span>
      </Link>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        {/* My courses */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">My courses</h2>
            <Link to="/student/courses" className="text-sm font-semibold text-rose-700 hover:underline">
              View all
            </Link>
          </div>
          {d.recentCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {d.recentCourses.map((c) => (
                <CourseProgressCard key={c.enrollment.id} course={c} />
              ))}
            </div>
          ) : (
            <EmptyState title="No courses yet" description="Enroll in a course to start learning." action={<LinkButton to="/courses">Browse courses</LinkButton>} compact />
          )}
        </section>

        {/* Upcoming live */}
        <section className="space-y-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Upcoming live classes</h2>
              <Link to="/student/live-classes" className="text-sm font-semibold text-rose-700 hover:underline">
                All classes
              </Link>
            </div>
            {d.upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {d.upcomingSessions.slice(0, 3).map((s) => (
                  <LiveClassCard key={s.id} session={s} compact action={<LinkButton to="/student/live-classes" size="sm" variant={s.canJoinNow ? 'primary' : 'outline'}>{s.canJoinNow ? 'Join now' : 'View details'}</LinkButton>} />
                ))}
              </div>
            ) : (
              <EmptyState title="No live classes scheduled" description="Your enrolled courses have no upcoming sessions." compact />
            )}
          </div>

          {d.recentCertificates.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">Recent certificates</h2>
                <Link to="/student/certificates" className="text-sm font-semibold text-rose-700 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="card divide-y divide-ivory-200">
                {d.recentCertificates.map((c) => (
                  <li key={c.id}>
                    <Link to={`/student/certificates/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-rose-50/40">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                        <Award className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.courseTitle}</p>
                        <p className="text-xs text-charcoal-500">
                          {c.certificateNumber} · {formatDate(c.issuedAt)}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
