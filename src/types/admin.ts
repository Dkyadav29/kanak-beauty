import type { ISODateString } from './common';
import type { PaymentStatus } from './payment';

export interface AdminOverviewStats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  publishedCourses: number;
  activeBatches: number;
  upcomingLiveClasses: number;
  paidEnrollments: number;
  totalPaymentsReceived: number;
  pendingPayments: number;
  pendingPaymentAmount: number;
  completedCourses: number;
  certificatesIssued: number;
  currency: string;
  range: { from: ISODateString; to: ISODateString };
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  enrollments: number;
}

export interface CourseEnrollmentPoint {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  completions: number;
}

export interface AdminAnalytics {
  revenueByMonth: RevenuePoint[];
  enrollmentsByCourse: CourseEnrollmentPoint[];
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  at: ISODateString;
}

export interface AuditLogFilters {
  search?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export interface StudentDirectoryRow {
  id: string;
  name: string;
  email: string;
  mobile: string;
  avatarUrl: string | null;
  createdAt: ISODateString;
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  lastPaymentStatus: PaymentStatus | 'none';
  isActive: boolean;
}

export interface StudentFilters {
  search?: string;
  courseId?: string;
  batchId?: string;
  paymentStatus?: PaymentStatus | 'all';
  enrollmentStatus?: 'active' | 'completed' | 'none' | 'all';
}

export interface StudentDetailAdminView {
  profile: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    avatarUrl: string | null;
    createdAt: ISODateString;
    emailVerified: boolean;
    dateOfBirth: string | null;
    address: string | null;
  };
  enrollments: Array<{
    enrollmentId: string;
    courseId: string;
    courseTitle: string;
    batchName: string | null;
    accessStatus: string;
    progressPercent: number;
    enrolledAt: ISODateString;
    completedAt: ISODateString | null;
    attendancePercent: number | null;
  }>;
  payments: Array<{
    id: string;
    orderId: string;
    courseTitle: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    createdAt: ISODateString;
  }>;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    courseTitle: string;
    issuedAt: ISODateString;
    status: 'issued' | 'revoked';
  }>;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}
