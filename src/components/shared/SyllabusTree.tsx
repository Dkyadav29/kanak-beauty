import { useState } from 'react';
import { Award, ChevronDown, FileText, Lock, PlayCircle, Radio, Video } from 'lucide-react';
import type { CourseModule, Lesson } from '@/types';
import { syllabusWeeks } from '@/lib/syllabus';
import { cn, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui';

const lessonIcon = (type: Lesson['type']) => {
  switch (type) {
    case 'live':
      return <Radio className="h-4 w-4 text-rose-600" />;
    case 'reading':
      return <FileText className="h-4 w-4 text-gold-700" />;
    case 'assessment':
      return <Award className="h-4 w-4 text-emerald-600" />;
    default:
      return <Video className="h-4 w-4 text-rose-600" />;
  }
};

const LessonRow = ({ lesson, enrolled }: { lesson: Lesson; enrolled: boolean }) => {
  const preview = !enrolled && lesson.isPreview;
  return (
    <li className="flex items-start gap-3 px-5 py-3 text-sm">
      <span className="mt-0.5">{lessonIcon(lesson.type)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-charcoal-800">{lesson.title}</span>
        {lesson.summary ? <span className="block text-xs text-charcoal-500">{lesson.summary}</span> : null}
      </span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {!lesson.isRequired ? <Badge tone="neutral">Optional</Badge> : null}
        {preview ? (
          lesson.videoUrl ? (
            <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline">
              <PlayCircle className="h-3.5 w-3.5" /> Free preview
            </a>
          ) : (
            <Badge tone="rose">Free preview</Badge>
          )
        ) : null}
        <span className="text-charcoal-500">{formatDuration(lesson.durationMinutes)}</span>
        {!enrolled && !lesson.isPreview ? <Lock className="h-3.5 w-3.5 text-charcoal-500/60" aria-label="Enroll to access" /> : null}
      </span>
    </li>
  );
};

/** Public/enrolled syllabus: collapsible Weeks → Days → Lessons. The first week and its first day start open. */
export const SyllabusTree = ({ modules, enrolled }: { modules: CourseModule[]; enrolled: boolean }) => {
  const weeks = syllabusWeeks(modules);
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => new Set(weeks[0] ? [weeks[0].week.id] : []));
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set(weeks[0]?.days[0] ? [weeks[0].days[0].day.id] : []));
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <div className="space-y-3">
      {weeks.map(({ week, number, loose, days }) => {
        const open = openWeeks.has(week.id);
        const count = loose.length + days.reduce((n, d) => n + d.lessons.length, 0);
        return (
          <div key={week.id} className="card overflow-hidden">
            <button type="button" onClick={() => setOpenWeeks((s) => toggle(s, week.id))} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open}>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Week {number}</p>
                <h3 className="font-display text-xl font-semibold text-charcoal-900">{week.title}</h3>
                {week.description ? <p className="text-sm text-charcoal-500">{week.description}</p> : null}
              </div>
              <span className="flex shrink-0 items-center gap-3 text-sm text-charcoal-500">
                {days.length ? `${days.length} day${days.length === 1 ? '' : 's'} · ` : ''}
                {count} lesson{count === 1 ? '' : 's'}
                <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
              </span>
            </button>
            {open ? (
              <div className="border-t border-ivory-200">
                {loose.length ? (
                  <ul className="divide-y divide-ivory-200">
                    {loose.map((l) => (
                      <LessonRow key={l.id} lesson={l} enrolled={enrolled} />
                    ))}
                  </ul>
                ) : null}
                {days.map(({ day, number: dayNo, lessons }) => {
                  const dayOpen = openDays.has(day.id);
                  return (
                    <div key={day.id} className="border-t border-ivory-200 first:border-t-0">
                      <button type="button" onClick={() => setOpenDays((s) => toggle(s, day.id))} className="flex w-full items-center justify-between gap-3 bg-ivory-50 px-5 py-3 text-left" aria-expanded={dayOpen}>
                        <span className="min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">Day {dayNo}</span>
                          <span className="block font-medium text-charcoal-900">{day.title}</span>
                          {day.description ? <span className="block text-xs text-charcoal-500">{day.description}</span> : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-charcoal-500">
                          {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
                          <ChevronDown className={cn('h-4 w-4 transition-transform', dayOpen && 'rotate-180')} />
                        </span>
                      </button>
                      {dayOpen && lessons.length ? (
                        <ul className="divide-y divide-ivory-200">
                          {lessons.map((l) => (
                            <LessonRow key={l.id} lesson={l} enrolled={enrolled} />
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
