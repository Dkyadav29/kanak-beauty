import type { ISODateString } from './common';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseFormat = 'live' | 'recorded' | 'hybrid';
export type CourseStatus = 'draft' | 'published' | 'unpublished';
export type LessonType = 'video' | 'reading' | 'live' | 'assessment';
export type CertificateIssuanceMode = 'automatic' | 'manual_approval';

export interface Trainer {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string | null;
  specialities: string[];
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'image' | 'link';
  sizeLabel?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  order: number;
  isRequired: boolean;
  summary: string;
  materials: LearningMaterial[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export interface CompletionCriteria {
  requireAllRequiredLessons: boolean;
  minLiveAttendancePercent: number | null;
  requireAssessment: boolean;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  trainer: Trainer;
  durationWeeks: number;
  totalHours: number;
  level: CourseLevel;
  format: CourseFormat;
  price: number;
  discountPrice: number | null;
  currency: string;
  status: CourseStatus;
  featured: boolean;
  certificateEnabled: boolean;
  certificateIssuance: CertificateIssuanceMode;
  completionCriteria: CompletionCriteria;
  prerequisites: string[];
  outcomes: string[];
  scheduleSummary: string;
  modules: CourseModule[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Catalogue-safe summary: public metadata plus module/lesson counts, no lesson content. */
export type CourseSummary = Omit<Course, 'modules'> & {
  moduleCount: number;
  lessonCount: number;
};

export interface CourseUpsertRequest {
  title: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  trainerId: string;
  durationWeeks: number;
  totalHours: number;
  level: CourseLevel;
  format: CourseFormat;
  price: number;
  discountPrice: number | null;
  status: CourseStatus;
  featured: boolean;
  certificateEnabled: boolean;
  certificateIssuance: CertificateIssuanceMode;
  completionCriteria: CompletionCriteria;
  prerequisites: string[];
  outcomes: string[];
  scheduleSummary: string;
}

export interface CourseFilters {
  search?: string;
  level?: CourseLevel | 'all';
  format?: CourseFormat | 'all';
  status?: CourseStatus | 'all';
}
