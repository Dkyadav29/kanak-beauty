import type { ISODateString } from './common';
import type { CourseFormat } from './course';
import type { PaymentStatus, RefundStatus } from './payment';

export type EnrollmentAccessStatus = 'pending_payment' | 'active' | 'suspended' | 'revoked';
export type EnrollmentSource = 'purchase' | 'admin_grant';

export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  batchId: string | null;
  source: EnrollmentSource;
  accessStatus: EnrollmentAccessStatus;
  paymentId: string | null;
  enrolledAt: ISODateString;
  completedAt: ISODateString | null;
}

/** Enrollment enriched for the student's My Courses view. */
export interface EnrolledCourseView {
  enrollment: CourseEnrollment;
  courseId: string;
  title: string;
  thumbnailUrl: string;
  trainerName: string;
  format: CourseFormat;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextSessionAt: ISODateString | null;
  isCompleted: boolean;
  certificateId: string | null;
}

/** Admin view joining student, course and payment. */
export interface EnrollmentAdminRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  batchId: string | null;
  batchName: string | null;
  orderId: string | null;
  amount: number | null;
  currency: string;
  paymentStatus: PaymentStatus | 'none';
  refundStatus: RefundStatus;
  accessStatus: EnrollmentAccessStatus;
  source: EnrollmentSource;
  enrolledAt: ISODateString;
  completedAt: ISODateString | null;
}

export interface EnrollmentFilters {
  search?: string;
  courseId?: string;
  paymentStatus?: PaymentStatus | 'none' | 'all';
  accessStatus?: EnrollmentAccessStatus | 'all';
}
