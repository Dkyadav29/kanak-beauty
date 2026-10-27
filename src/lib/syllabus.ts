import type { CourseDay, CourseModule, Lesson } from '@/types';

/** One week of the syllabus: lessons placed directly in the week, then its days (numbered across the course). */
export interface WeekView {
  week: CourseModule;
  number: number;
  loose: Lesson[];
  days: Array<{ day: CourseDay; number: number; lessons: Lesson[] }>;
}

/**
 * Course → Weeks → Days → Lessons, as returned by the API (which already hides drafts for
 * students). Day numbers run continuously (Week 2 starts at Day 6 if Week 1 had five days).
 * Responses without `days` (older backends) show every lesson directly in the week.
 */
export const syllabusWeeks = (modules: CourseModule[]): WeekView[] => {
  let dayNumber = 0;
  return [...modules]
    .sort((a, b) => a.order - b.order)
    .map((week, i) => {
      const days = [...(week.days ?? [])].sort((a, b) => a.order - b.order);
      const inDay = new Set(days.flatMap((d) => d.lessons.map((l) => l.id)));
      return {
        week,
        number: i + 1,
        loose: week.lessons.filter((l) => !l.dayId || !inDay.has(l.id)),
        days: days.map((day) => ({ day, number: ++dayNumber, lessons: day.lessons })),
      };
    });
};

export const syllabusCounts = (weeks: WeekView[]) => ({
  weeks: weeks.length,
  days: weeks.reduce((n, w) => n + w.days.length, 0),
  lessons: weeks.reduce((n, w) => n + w.loose.length + w.days.reduce((m, d) => m + d.lessons.length, 0), 0),
});
