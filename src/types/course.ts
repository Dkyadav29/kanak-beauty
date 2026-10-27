import type { ISODateString } from './common';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseFormat = 'live' | 'recorded' | 'hybrid';
export type CourseStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type DurationUnit = 'days' | 'weeks' | 'months';
export type DiscountType = '' | 'percentage' | 'fixed';
export type PaymentPlanType = 'full' | 'daily' | 'monthly' | 'custom';

/** GET /course-categories (public) and /admin/course-categories (adds courseCount). */
export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Duration range (in days) a category covers; used to place courses without an explicit category. */
  minDays: number | null;
  maxDays: number | null;
  order: number;
  isActive: boolean;
  courseCount?: number;
}

export interface CourseCategoryUpsertRequest {
  name: string;
  description: string;
  minDays: number | null;
  maxDays: number | null;
  order: number;
  isActive: boolean;
}

/** Admin configuration of the custom installment plan; amounts are computed by the backend. */
export interface CustomPlanConfig {
  enabled: boolean;
  depositAmount: number;
  installmentCount: number | null;
  frequency: DurationUnit;
  interval: number;
  additionalFee: number;
}

export interface ScheduledInstallment {
  sequence: number;
  kind: 'deposit' | 'installment';
  amount: number;
  /** Days after enrolment (approximate for monthly plans, which follow calendar months). */
  dueInDays: number;
  /** Estimated date if the plan starts today (YYYY-MM-DD); the real schedule starts at the first payment. */
  dueDate?: string;
}

/** One payment option as offered today. Computed by the backend; display only. */
export interface PaymentOption {
  type: PaymentPlanType;
  label: string;
  totalAmount: number;
  additionalFee: number;
  installmentCount: number;
  /** The repeating amount (only the first installment can differ, by rounding). */
  installmentAmount: number;
  depositAmount: number;
  frequency: DurationUnit | null;
  schedule: ScheduledInstallment[];
}

export interface CoursePricing {
  listPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  isDiscountActive: boolean;
  discountEndsAt: ISODateString | null;
  paymentOptions: PaymentOption[];
}
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

/** GET /admin/trainers: adds admin-only contact details and the active flag. */
export interface AdminTrainer extends Trainer {
  mobile: string;
  email: string;
  isActive: boolean;
  /** Certificate signature as a data: URI; null until uploaded. Admin-only. */
  signatureImage: string | null;
}

/** POST /admin/trainers, PUT /admin/trainers/{id}. ``isActive`` omitted on update keeps the current value. */
export interface TrainerUpsertRequest {
  name: string;
  /** Optional; omitted on update keeps the current title. */
  title?: string;
  mobile: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  specialities: string[];
  isActive?: boolean;
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'image' | 'link';
  sizeLabel?: string;
}

/** A day inside a week (CourseModule): Course → Weeks → Days → Lessons. */
export interface CourseDay {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  /** Null for lessons placed directly in the week. */
  dayId?: string | null;
  /** Free preview: visible (with its video) before purchase. */
  isPreview?: boolean;
  isPublished?: boolean;
  title: string;
  type: LessonType;
  durationMinutes: number;
  order: number;
  isRequired: boolean;
  summary: string;
  /** Google Drive (or other https) video. Only present for admins and enrolled students, never on public pages. */
  videoUrl?: string;
  materials: LearningMaterial[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  isPublished?: boolean;
  /** All lessons of the week (flat, curriculum order), each with its dayId. */
  lessons: Lesson[];
  /** Day-wise grouping of the same lessons. */
  days?: CourseDay[];
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
  /** Null until an admin assigns a trainer. */
  trainer: Trainer | null;
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
  category: CourseCategory | null;
  durationValue: number;
  durationUnit: DurationUnit;
  durationDays: number;
  discountType: DiscountType;
  discountValue: number | null;
  discountStartsAt: ISODateString | null;
  discountEndsAt: ISODateString | null;
  promotionalPrice: number | null;
  allowFullPayment: boolean;
  allowDailyInstallments: boolean;
  allowMonthlyInstallments: boolean;
  customPlan: CustomPlanConfig;
  /** Authoritative, backend-computed price and payment options. */
  pricing: CoursePricing;
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
  /** Optional; null or empty leaves the course without a trainer. */
  trainerId: string | null;
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
  /** Null places the course by duration. */
  categoryId: string | null;
  durationValue: number;
  durationUnit: DurationUnit;
  discountType: DiscountType;
  discountValue: number | null;
  discountStartsAt: ISODateString | null;
  discountEndsAt: ISODateString | null;
  promotionalPrice: number | null;
  allowFullPayment: boolean;
  allowDailyInstallments: boolean;
  allowMonthlyInstallments: boolean;
  customPlan: CustomPlanConfig;
}

export interface CourseFilters {
  search?: string;
  level?: CourseLevel | 'all';
  format?: CourseFormat | 'all';
  status?: CourseStatus | 'all';
  /** Category slug or id. */
  category?: string;
}
