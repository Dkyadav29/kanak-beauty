import type { ISODateString } from './common';

export interface LessonProgress {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  completedAt: ISODateString | null;
  lastPositionSeconds: number;
  updatedAt: ISODateString;
}

export interface CourseProgressSummary {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  requiredLessons: number;
  completedRequiredLessons: number;
  progressPercent: number;
  lastLessonId: string | null;
  lessons: LessonProgress[];
  liveAttendancePercent: number | null;
  assessmentPassed: boolean | null;
  completionEligible: boolean;
  isCompleted: boolean;
  completedAt: ISODateString | null;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  recordedAt: ISODateString;
}

export interface UpdateLessonProgressRequest {
  completed?: boolean;
  lastPositionSeconds?: number;
}
