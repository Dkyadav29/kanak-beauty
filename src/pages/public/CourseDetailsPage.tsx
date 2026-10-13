import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock, FileText, Lock, PlayCircle, Radio, UserRound } from 'lucide-react';
import { useCourse, useCourseSessions } from '@/hooks/useCatalog';
import { useAuth } from '@/features/auth/AuthContext';
import { useEnrollments } from '@/hooks/useStudent';
import type { Lesson } from '@/types';
import { cn, formatDuration } from '@/lib/utils';
import { PriceTag } from '@/components/shared/CourseCard';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { Avatar, Badge, ErrorState, ImageWithFallback, LinkButton, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { NotFoundPage } from '@/pages/ErrorPages';

const lessonIcon = (type: Lesson['type']) => {
  switch (type) {
    case 'live':
      return <Radio className="h-4 w-4 text-rose-600" />;
    case 'reading':
      return <FileText className="h-4 w-4 text-gold-700" />;
    case 'assessment':
      return <Award className="h-4 w-4 text-emerald-600" />;
    default:
      return <PlayCircle className="h-4 w-4 text-charcoal-700" />;
  }
};

const CourseDetailsPage = () => {
  const { courseId } = useParams();
  const course = useCourse(courseId);
  const sessions = useCourseSessions(courseId);
  const { isAuthenticated, user } = useAuth();
  const enrollments = useEnrollments();
  const [openModule, setOpenModule] = useState<string | null>(null);

  if (course.isLoading) {
    return (
      <div className="container-x py-12">
        <LoadingSkeleton variant="page" />
      </div>
    );
  }
  if (course.error) {
    const status = (course.error as { status?: number }).status;
    if (status === 404) return <NotFoundPage />;
    return (
      <div className="container-x py-12">
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      </div>
    );
  }
  const c = course.data!;
  const isStudent = isAuthenticated && user?.role === 'student';
  const enrolled = isStudent ? enrollments.data?.find((e) => e.courseId === c.id && e.enrollment.accessStatus === 'active') : undefined;
  const lessons = c.modules.flatMap((m) => m.lessons);
  const totalMinutes = lessons.reduce((n, l) => n + l.durationMinutes, 0);

  return (
    <>
      <section className="border-b border-ivory-300 bg-white">
        <div className="container-x grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr] lg:py-16">
          <div>
            <nav className="text-sm text-charcoal-500" aria-label="Breadcrumb">
              <Link to="/courses" className="hover:text-rose-700">
                Courses
              </Link>{' '}
              / <span className="text-charcoal-800">{c.title}</span>
            </nav>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={c.level} />
              <StatusBadge status={c.format} />
              {c.certificateEnabled ? (
                <Badge tone="gold">
                  <Award className="h-3 w-3" /> Certificate on completion
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-charcoal-900 sm:text-5xl">{c.title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-charcoal-500">{c.shortDescription}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-charcoal-700">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-600" /> {c.durationWeeks} weeks · {c.totalHours} hours
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-rose-600" /> {c.modules.length} modules · {lessons.length} lessons
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-rose-600" /> {c.scheduleSummary}
              </li>
            </ul>
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-ivory-300 bg-ivory-100 p-4">
              <Avatar name={c.trainer.name} src={c.trainer.avatarUrl} size="lg" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Your trainer</p>
                <p className="font-display text-xl font-semibold text-charcoal-900">{c.trainer.name}</p>
                <p className="text-sm text-charcoal-500">{c.trainer.title}</p>
              </div>
            </div>
          </div>

          <aside className="card self-start overflow-hidden lg:sticky lg:top-24">
            <ImageWithFallback src={c.thumbnailUrl} alt={c.title} className="aspect-[16/10] w-full object-cover" fallbackLabel={c.title} />
            <div className="p-6">
              <PriceTag price={c.price} discountPrice={c.discountPrice} currency={c.currency} size="lg" />
              <p className="mt-1 text-xs text-charcoal-500">One-time payment · Secure checkout · GST as applicable</p>
              <div className="mt-5 space-y-2">
                {enrolled ? (
                  <LinkButton to={`/student/courses/${c.id}/learn`} className="w-full" size="lg">
                    Continue learning
                  </LinkButton>
                ) : (
                  <LinkButton to={`/student/checkout/${c.id}`} className="w-full" size="lg">
                    Enroll Now
                  </LinkButton>
                )}
                {!isAuthenticated ? (
                  <p className="text-center text-xs text-charcoal-500">
                    You will be asked to{' '}
                    <Link to="/login" state={{ from: `/student/checkout/${c.id}` }} className="font-semibold text-rose-700 hover:underline">
                      log in
                    </Link>{' '}
                    or create an account before payment.
                  </p>
                ) : null}
              </div>
              <ul className="mt-6 space-y-2.5 text-sm text-charcoal-700">
                {['Structured curriculum with progress tracking', c.format !== 'recorded' ? 'Scheduled live studio sessions' : 'Recorded lessons available anytime', 'Downloadable reference notes', c.certificateEnabled ? 'Verifiable completion certificate' : 'Participation record'].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="container-x grid gap-12 py-12 lg:grid-cols-[1.3fr_1fr] lg:py-16">
        <div className="space-y-12">
          <div>
            <h2 className="font-display text-3xl font-semibold text-charcoal-900">About this course</h2>
            <p className="mt-4 leading-relaxed text-charcoal-700">{c.description}</p>
          </div>

          <div>
            <h2 className="font-display text-3xl font-semibold text-charcoal-900">What you will learn</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2.5 rounded-xl border border-ivory-300 bg-white p-3.5 text-sm text-charcoal-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> {o}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-3xl font-semibold text-charcoal-900">Curriculum</h2>
              <p className="text-sm text-charcoal-500">
                {c.modules.length} modules · {lessons.length} lessons · {formatDuration(totalMinutes)}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {c.modules.map((m) => {
                const open = openModule === m.id || (openModule === null && m.order === 1);
                return (
                  <div key={m.id} className="card overflow-hidden">
                    <button type="button" onClick={() => setOpenModule(open ? '' : m.id)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open}>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Module {m.order}</p>
                        <h3 className="font-display text-xl font-semibold text-charcoal-900">{m.title}</h3>
                        <p className="text-sm text-charcoal-500">{m.description}</p>
                      </div>
                      <span className="flex items-center gap-3 text-sm text-charcoal-500">
                        {m.lessons.length} lessons
                        <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
                      </span>
                    </button>
                    {open ? (
                      <ul className="divide-y divide-ivory-200 border-t border-ivory-200">
                        {m.lessons.map((l) => (
                          <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                            {lessonIcon(l.type)}
                            <span className="flex-1 text-charcoal-800">{l.title}</span>
                            {!l.isRequired ? <Badge tone="neutral">Optional</Badge> : null}
                            <span className="text-charcoal-500">{formatDuration(l.durationMinutes)}</span>
                            {!enrolled ? <Lock className="h-3.5 w-3.5 text-charcoal-500/60" aria-label="Enroll to access" /> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display text-3xl font-semibold text-charcoal-900">Prerequisites</h2>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-charcoal-700">
              {c.prerequisites.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-2xl font-semibold text-charcoal-900">Completion & certificate requirements</h2>
            <ul className="mt-3 space-y-2 text-sm text-charcoal-700">
              {c.completionCriteria.requireAllRequiredLessons ? <li>• Complete every required lesson.</li> : null}
              {c.completionCriteria.minLiveAttendancePercent !== null ? <li>• Attend at least {c.completionCriteria.minLiveAttendancePercent}% of live sessions.</li> : null}
              {c.completionCriteria.requireAssessment ? <li>• Pass the final assessment.</li> : null}
              <li>• {c.certificateEnabled ? (c.certificateIssuance === 'automatic' ? 'Your certificate is issued automatically once requirements are verified.' : 'Certificates are issued after trainer review of your completed work.') : 'This course does not issue a certificate.'}</li>
            </ul>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <h2 className="font-display text-2xl font-semibold text-charcoal-900">Meet your trainer</h2>
            <div className="card mt-4 p-6">
              <div className="flex items-center gap-4">
                <Avatar name={c.trainer.name} src={c.trainer.avatarUrl} size="xl" />
                <div>
                  <p className="font-display text-xl font-semibold">{c.trainer.name}</p>
                  <p className="text-sm text-charcoal-500">{c.trainer.title}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-700">{c.trainer.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.trainer.specialities.map((s) => (
                  <Badge key={s} tone="rose">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-charcoal-900">Upcoming schedule</h2>
            <div className="mt-4 space-y-3">
              {sessions.isLoading ? (
                <LoadingSkeleton variant="list" count={2} />
              ) : sessions.data && sessions.data.length > 0 ? (
                sessions.data.slice(0, 4).map((s) => <LiveClassCard key={s.id} session={s} compact />)
              ) : (
                <div className="card p-5 text-sm text-charcoal-500">
                  <UserRound className="mb-2 h-5 w-5 text-rose-600" />
                  {c.format === 'recorded' ? 'This is a self-paced recorded course. Start whenever you like.' : 'No live sessions are scheduled right now. New batch dates are announced to enrolled students first.'}
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
};

export default CourseDetailsPage;
