import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle2, ChevronLeft, ChevronRight, Circle, Download, FileText, Lock, MessageCircle, PlayCircle, Radio } from 'lucide-react';
import { useCourseProgress, useStudentCourse, useStudentLiveSessions, useUpdateLessonProgress } from '@/hooks/useStudent';
import { getErrorMessage } from '@/lib/api/errors';
import { ApiError } from '@/lib/api/errors';
import { cn, formatDuration } from '@/lib/utils';
import type { Lesson } from '@/types';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { Badge, Button, ErrorState, InlineAlert, LinkButton, LoadingSkeleton, ProgressBar, useToast } from '@/components/ui';
import { ForbiddenPage } from '@/pages/ErrorPages';

const typeIcon = (type: Lesson['type'], className = 'h-4 w-4') => {
  if (type === 'live') return <Radio className={className} />;
  if (type === 'reading') return <FileText className={className} />;
  if (type === 'assessment') return <Award className={className} />;
  return <PlayCircle className={className} />;
};

const CourseLearningPage = () => {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const course = useStudentCourse(courseId);
  const progress = useCourseProgress(courseId);
  const sessions = useStudentLiveSessions('upcoming');
  const update = useUpdateLessonProgress(courseId ?? '');
  const toast = useToast();
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const lessons = useMemo(() => course.data?.modules.flatMap((m) => m.lessons) ?? [], [course.data]);
  const completedIds = useMemo(() => new Set(progress.data?.lessons.filter((l) => l.completed).map((l) => l.lessonId)), [progress.data]);

  const lessonParam = params.get('lesson');
  const current = lessons.find((l) => l.id === lessonParam) ?? lessons.find((l) => l.id === progress.data?.lastLessonId) ?? lessons.find((l) => !completedIds.has(l.id)) ?? lessons[0];

  useEffect(() => {
    if (current && lessonParam !== current.id) setParams({ lesson: current.id }, { replace: true });
  }, [current, lessonParam, setParams]);

  if (course.isLoading || progress.isLoading) return <LoadingSkeleton variant="page" />;
  if (course.error) {
    if (course.error instanceof ApiError && (course.error.status === 403 || course.error.status === 404)) {
      return (
        <div className="space-y-4">
          <ForbiddenPage />
          <p className="text-center text-sm text-charcoal-500">
            You do not have access to this course.{' '}
            <Link to={`/courses/${courseId}`} className="font-semibold text-rose-700 hover:underline">
              View the course page
            </Link>{' '}
            to enroll.
          </p>
        </div>
      );
    }
    return <ErrorState error={course.error} onRetry={() => void course.refetch()} />;
  }
  if (!course.data || !progress.data || !current) return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />;

  const c = course.data;
  const p = progress.data;
  const index = lessons.findIndex((l) => l.id === current.id);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const isDone = completedIds.has(current.id);
  const courseSessions = (sessions.data ?? []).filter((s) => s.courseId === c.id).slice(0, 3);

  const toggleComplete = async () => {
    try {
      await update.mutateAsync({ lessonId: current.id, payload: { completed: !isDone } });
      if (!isDone) toast.success('Lesson completed', next ? `Up next: ${next.title}` : 'You have reached the end of the course.');
    } catch (e) {
      toast.error('Could not update progress', getErrorMessage(e));
    }
  };

  const go = (l: Lesson) => {
    setParams({ lesson: l.id });
    setMobileSidebar(false);
  };

  const Sidebar = (
    <nav aria-label="Course modules" className="space-y-5">
      {c.modules.map((m) => (
        <div key={m.id}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-500">
            Module {m.order} · {m.title}
          </p>
          <ul className="space-y-1">
            {m.lessons.map((l) => {
              const done = completedIds.has(l.id);
              const active = l.id === current.id;
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => go(l)} className={cn('flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors', active ? 'bg-rose-50 text-rose-800' : 'hover:bg-ivory-200')} aria-current={active ? 'true' : undefined}>
                    {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-500/50" />}
                    <span className="flex-1">
                      <span className={cn('block leading-snug', done && !active && 'text-charcoal-500')}>{l.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-charcoal-500">
                        {typeIcon(l.type, 'h-3 w-3')} {formatDuration(l.durationMinutes)}
                        {!l.isRequired ? ' · optional' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/student/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-rose-700">
            <ArrowLeft className="h-4 w-4" /> My courses
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{c.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-500">{c.shortDescription}</p>
        </div>
        <div className="w-full lg:w-72">
          <div className="flex items-center justify-between text-xs text-charcoal-500">
            <span>
              {p.completedLessons}/{p.totalLessons} lessons
            </span>
            <span className="font-semibold text-charcoal-800">{p.progressPercent}%</span>
          </div>
          <ProgressBar value={p.progressPercent} tone={p.isCompleted ? 'success' : 'rose'} className="mt-1.5" />
        </div>
      </div>

      {p.isCompleted ? (
        <InlineAlert tone="success" className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4" /> You have completed this course.
          </span>
          <Link to="/student/certificates" className="font-semibold underline">
            View my certificates
          </Link>
        </InlineAlert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="card hidden max-h-[calc(100vh-8rem)] overflow-y-auto p-4 scrollbar-thin lg:sticky lg:top-24 lg:block">{Sidebar}</aside>
        <div className="lg:hidden">
          <Button variant="outline" className="w-full" onClick={() => setMobileSidebar((s) => !s)}>
            {mobileSidebar ? 'Hide' : 'Show'} course modules
          </Button>
          {mobileSidebar ? <div className="card mt-3 p-4">{Sidebar}</div> : null}
        </div>

        <section className="space-y-6">
          <div className="card overflow-hidden">
            <div className="relative aspect-video bg-charcoal-900 text-white">
              {current.type === 'video' ? (
                <video key={current.id} controls className="h-full w-full" src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" poster={c.thumbnailUrl} onEnded={() => !isDone && void toggleComplete()} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">{typeIcon(current.type, 'h-7 w-7')}</span>
                  <p className="font-display text-2xl font-semibold">{current.title}</p>
                  <p className="max-w-md text-sm text-white/70">
                    {current.type === 'live' ? 'This lesson is delivered live. It is marked complete automatically when your attendance is recorded.' : current.type === 'assessment' ? 'Complete the assessment tasks described below, then submit to record your result.' : 'Read the lesson notes below.'}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                    Lesson {index + 1} of {lessons.length}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">{current.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-charcoal-500">
                    <Badge tone="neutral">{current.type}</Badge> {formatDuration(current.durationMinutes)} {!current.isRequired ? <Badge tone="gold">Optional</Badge> : null}
                  </p>
                </div>
                {current.type === 'live' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-charcoal-500">
                    <Lock className="h-4 w-4" /> Completed via attendance
                  </span>
                ) : (
                  <Button variant={isDone ? 'outline' : 'primary'} onClick={() => void toggleComplete()} loading={update.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                    {isDone ? 'Completed' : current.type === 'assessment' ? 'Submit assessment' : 'Mark as complete'}
                  </Button>
                )}
              </div>
              <p className="mt-4 leading-relaxed text-charcoal-700">{current.summary}</p>
              {current.type === 'reading' ? (
                <div className="mt-4 rounded-2xl bg-ivory-100 p-5 text-sm leading-relaxed text-charcoal-700">
                  Lesson notes are delivered by the backend content service. In this demo the lesson summary stands in for the full reading content.
                </div>
              ) : null}

              {current.materials.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-charcoal-800">Downloadable materials</h3>
                  <ul className="mt-2 space-y-2">
                    {current.materials.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-ivory-300 p-3 text-sm">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-rose-600" /> {m.title}
                          {m.sizeLabel ? <span className="text-xs text-charcoal-500">({m.sizeLabel})</span> : null}
                        </span>
                        <button type="button" className="inline-flex items-center gap-1.5 font-semibold text-rose-700 hover:underline" onClick={() => toast.info('Secure download', 'Material downloads are served by the backend with signed, expiring links.')}>
                          <Download className="h-4 w-4" /> Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-ivory-200 pt-5">
                <Button variant="outline" disabled={!prev} onClick={() => prev && go(prev)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                  Previous Lesson
                </Button>
                <Button variant="outline" disabled={!next} onClick={() => next && go(next)} rightIcon={<ChevronRight className="h-4 w-4" />}>
                  Next Lesson
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-display text-xl font-semibold">Completion requirements</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span>Required lessons</span>
                  <span className="font-semibold">
                    {p.completedRequiredLessons}/{p.requiredLessons}
                  </span>
                </li>
                {c.completionCriteria.minLiveAttendancePercent !== null ? (
                  <li className="flex items-center justify-between">
                    <span>Live attendance (min {c.completionCriteria.minLiveAttendancePercent}%)</span>
                    <span className="font-semibold">{p.liveAttendancePercent === null ? 'Pending' : `${p.liveAttendancePercent}%`}</span>
                  </li>
                ) : null}
                {c.completionCriteria.requireAssessment ? (
                  <li className="flex items-center justify-between">
                    <span>Assessment</span>
                    <span className="font-semibold">{p.assessmentPassed === null ? 'Pending' : p.assessmentPassed ? 'Passed' : 'Not yet'}</span>
                  </li>
                ) : null}
              </ul>
              <p className="mt-3 text-xs text-charcoal-500">Completion and certificates are confirmed by the academy backend, not by this page.</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Upcoming live sessions</h3>
              {courseSessions.length > 0 ? courseSessions.map((s) => <LiveClassCard key={s.id} session={s} compact action={<LinkButton to="/student/live-classes" size="sm" variant="outline">Open live classes</LinkButton>} />) : <p className="card p-4 text-sm text-charcoal-500">No upcoming live sessions for this course.</p>}
              <Link to="/contact" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline">
                <MessageCircle className="h-4 w-4" /> Need help? Contact course support
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CourseLearningPage;
