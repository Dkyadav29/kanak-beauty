import { apiClient } from '@/lib/api/client';
import type {
  AdminAnalytics,
  AdminOverviewStats,
  AuditLog,
  AuditLogFilters,
  Batch,
  BatchDetail,
  BatchEnrollment,
  BatchFilters,
  BatchStatus,
  BatchSummary,
  BatchUpsertRequest,
  Certificate,
  CertificateFilters,
  Course,
  CourseSummary,
  CourseUpsertRequest,
  DateRangeFilter,
  EligibleStudent,
  EnrollmentAdminRow,
  EnrollmentFilters,
  LiveSession,
  LiveSessionUpsertRequest,
  PageQuery,
  Paginated,
  PaymentFilters,
  PaymentTransaction,
  ReferralAdminRow,
  ReferralAdminStats,
  ReferralFilters,
  ReferralProgramConfig,
  StudentDetailAdminView,
  StudentDirectoryRow,
  StudentFilters,
  Trainer,
} from '@/types';

export interface CurriculumModuleInput {
  id?: string;
  title: string;
  description: string;
  lessons: Array<{
    id?: string;
    title: string;
    type: 'video' | 'reading' | 'live' | 'assessment';
    durationMinutes: number;
    isRequired: boolean;
    summary: string;
  }>;
}

export interface EnrolledStudentOption {
  studentId: string;
  name: string;
  email: string;
  batchId: string | null;
}

export const adminService = {
  // overview
  overview: async (range: DateRangeFilter = {}) => (await apiClient.get<AdminOverviewStats>('/admin/overview', { params: range })).data,
  analytics: async (range: DateRangeFilter = {}) => (await apiClient.get<AdminAnalytics>('/admin/analytics', { params: range })).data,

  // students
  students: async (filters: StudentFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<StudentDirectoryRow>>('/admin/students', { params: filters })).data,
  student: async (studentId: string) => (await apiClient.get<StudentDetailAdminView>(`/admin/students/${studentId}`)).data,

  // courses
  courses: async (filters: { search?: string; status?: string } = {}) =>
    (await apiClient.get<CourseSummary[]>('/admin/courses', { params: filters })).data,
  course: async (courseId: string) => (await apiClient.get<Course>(`/admin/courses/${courseId}`)).data,
  createCourse: async (payload: CourseUpsertRequest) => (await apiClient.post<Course>('/admin/courses', payload)).data,
  updateCourse: async (courseId: string, payload: CourseUpsertRequest) => (await apiClient.put<Course>(`/admin/courses/${courseId}`, payload)).data,
  publishCourse: async (courseId: string) => (await apiClient.post<Course>(`/admin/courses/${courseId}/publish`)).data,
  unpublishCourse: async (courseId: string) => (await apiClient.post<Course>(`/admin/courses/${courseId}/unpublish`)).data,
  updateCurriculum: async (courseId: string, modules: CurriculumModuleInput[]) =>
    (await apiClient.put<Course>(`/admin/courses/${courseId}/modules`, { modules })).data,
  enrolledStudents: async (courseId: string) =>
    (await apiClient.get<EnrolledStudentOption[]>(`/admin/courses/${courseId}/enrolled-students`)).data,
  trainers: async () => (await apiClient.get<Trainer[]>('/admin/trainers')).data,

  // batches
  batches: async (filters: BatchFilters & PageQuery = {}) => (await apiClient.get<Paginated<BatchSummary>>('/admin/batches', { params: filters })).data,
  batch: async (batchId: string) => (await apiClient.get<BatchDetail>(`/admin/batches/${batchId}`)).data,
  createBatch: async (payload: BatchUpsertRequest) => (await apiClient.post<Batch>('/admin/batches', payload)).data,
  updateBatch: async (batchId: string, payload: BatchUpsertRequest) => (await apiClient.put<Batch>(`/admin/batches/${batchId}`, payload)).data,
  changeBatchStatus: async (batchId: string, status: BatchStatus, reason?: string) =>
    (await apiClient.post<Batch>(`/admin/batches/${batchId}/status`, { status, reason })).data,
  addBatchStudent: async (batchId: string, studentId: string) =>
    (await apiClient.post<BatchEnrollment>(`/admin/batches/${batchId}/students`, { studentId })).data,
  withdrawBatchStudent: async (batchId: string, studentId: string, reason?: string) =>
    (await apiClient.post<BatchEnrollment>(`/admin/batches/${batchId}/students/${studentId}/withdraw`, { reason })).data,

  // live sessions
  sessions: async (filters: { batchId?: string; courseId?: string; scope?: 'all' | 'upcoming' } = {}) =>
    (await apiClient.get<LiveSession[]>('/admin/live-sessions', { params: filters })).data,
  createSession: async (payload: LiveSessionUpsertRequest) => (await apiClient.post<LiveSession>('/admin/live-sessions', payload)).data,
  cancelSession: async (sessionId: string) => (await apiClient.post<LiveSession>(`/admin/live-sessions/${sessionId}/cancel`)).data,
  recordAttendance: async (sessionId: string, records: Array<{ studentId: string; status: 'present' | 'absent' | 'late' }>) =>
    (await apiClient.post<{ sessionId: string; recorded: number }>(`/admin/live-sessions/${sessionId}/attendance`, { records })).data,

  // enrollments
  enrollments: async (filters: EnrollmentFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<EnrollmentAdminRow>>('/admin/enrollments', { params: filters })).data,
  grantEnrollment: async (payload: { studentId: string; courseId: string; reason: string }) =>
    (await apiClient.post<EnrollmentAdminRow>('/admin/enrollments/grant', payload)).data,
  setEnrollmentAccess: async (enrollmentId: string, accessStatus: 'active' | 'suspended', reason: string) =>
    (await apiClient.post<EnrollmentAdminRow>(`/admin/enrollments/${enrollmentId}/access`, { accessStatus, reason })).data,

  // payments
  payments: async (filters: PaymentFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<PaymentTransaction>>('/admin/payments', { params: filters })).data,
  reconcilePayment: async (paymentId: string) =>
    (await apiClient.post<{ payment: PaymentTransaction; gatewayStatus: string; changed: boolean }>(`/admin/payments/${paymentId}/reconcile`)).data,
  refundPayment: async (paymentId: string, reason: string) =>
    (await apiClient.post<PaymentTransaction>(`/admin/payments/${paymentId}/refund`, { reason })).data,

  // certificates
  certificates: async (filters: CertificateFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<Certificate>>('/admin/certificates', { params: filters })).data,
  certificate: async (certificateId: string) => (await apiClient.get<Certificate>(`/admin/certificates/${certificateId}`)).data,
  eligibleStudents: async () => (await apiClient.get<EligibleStudent[]>('/admin/certificates/eligible/list')).data,
  issueCertificate: async (payload: { studentId: string; courseId: string }) =>
    (await apiClient.post<Certificate>('/admin/certificates/issue', payload)).data,
  revokeCertificate: async (certificateId: string, reason: string) =>
    (await apiClient.post<Certificate>(`/admin/certificates/${certificateId}/revoke`, { reason })).data,
  reissueCertificate: async (certificateId: string, reason: string) =>
    (await apiClient.post<Certificate>(`/admin/certificates/${certificateId}/reissue`, { reason })).data,

  // refer & earn
  referrals: async (filters: ReferralFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<ReferralAdminRow>>('/admin/referrals', { params: filters })).data,
  referralStats: async () => (await apiClient.get<ReferralAdminStats>('/admin/referrals/stats')).data,
  referralConfig: async () => (await apiClient.get<ReferralProgramConfig>('/admin/referrals/config')).data,
  updateReferralConfig: async (payload: Omit<ReferralProgramConfig, 'currency'>) =>
    (await apiClient.put<ReferralProgramConfig>('/admin/referrals/config', payload)).data,

  // audit
  auditLogs: async (filters: AuditLogFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<AuditLog>>('/admin/audit-logs', { params: filters })).data,
};
