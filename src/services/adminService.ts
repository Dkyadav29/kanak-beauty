import { apiClient } from '@/lib/api/client';
import type {
  AdminAnalytics,
  AdminHeroSlide,
  AdminHomeVideo,
  HomeVideoInput,
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
  HeroSlideInput,
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
  CourseReferralSettingInput,
  CourseReferralTerms,
  StudentDetailAdminView,
  StudentDirectoryRow,
  StudentFilters,
  AdminTrainer,
  CourseCategory,
  CourseCategoryUpsertRequest,
  PolicySlug,
  PolicyVersion,
  SiteContact,
  SiteSettings,
  TrainerUpsertRequest,
  BatchCertificateResult,
  CertificateImageKind,
  CertificateSettings,
  CertificateSettingsUpdate,
} from '@/types';

export interface CurriculumLessonInput {
  id?: string;
  title: string;
  type: 'video' | 'reading' | 'live' | 'assessment';
  durationMinutes: number;
  isRequired: boolean;
  /** Free preview: visible (with its video) before purchase. */
  isPreview?: boolean;
  isPublished?: boolean;
  summary: string;
  /** Optional https link, e.g. a Google Drive share link. */
  videoUrl?: string;
}

/** A week of the syllabus: `days` hold the day-wise lessons; `lessons` are lessons without a day. */
export interface CurriculumModuleInput {
  id?: string;
  title: string;
  description: string;
  isPublished?: boolean;
  lessons: CurriculumLessonInput[];
  days?: Array<{ id?: string; title: string; description: string; isPublished?: boolean; lessons: CurriculumLessonInput[] }>;
}

export interface EnrolledStudentOption {
  studentId: string;
  name: string;
  email: string;
  batchId: string | null;
}

/**
 * Hero slide bodies go out as multipart when a file is attached (the backend reads
 * camelCase form keys), otherwise as plain JSON.
 */
const heroSlideRequest = (input: HeroSlideInput) => {
  if (!input.image) return { body: input as object, config: {} };
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) return;
    form.append(key, value instanceof File ? value : String(value));
  });
  return { body: form, config: { headers: { 'Content-Type': 'multipart/form-data' } } };
};

/** Single image as multipart `file` (trainer signature, certificate stamp, ...). */
const imageForm = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

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
  courseCategories: async () => (await apiClient.get<CourseCategory[]>('/admin/course-categories')).data,
  createCourseCategory: async (payload: CourseCategoryUpsertRequest) => (await apiClient.post<CourseCategory>('/admin/course-categories', payload)).data,
  updateCourseCategory: async (categoryId: string, payload: CourseCategoryUpsertRequest) =>
    (await apiClient.put<CourseCategory>(`/admin/course-categories/${categoryId}`, payload)).data,
  deleteCourseCategory: async (categoryId: string) => {
    await apiClient.delete(`/admin/course-categories/${categoryId}`);
  },
  trainers: async () => (await apiClient.get<AdminTrainer[]>('/admin/trainers')).data,
  createTrainer: async (payload: TrainerUpsertRequest) => (await apiClient.post<AdminTrainer>('/admin/trainers', payload)).data,
  updateTrainer: async (trainerId: string, payload: TrainerUpsertRequest) =>
    (await apiClient.put<AdminTrainer>(`/admin/trainers/${trainerId}`, payload)).data,
  uploadTrainerSignature: async (trainerId: string, file: File) =>
    (await apiClient.post<AdminTrainer>(`/admin/trainers/${trainerId}/signature`, imageForm(file), multipart)).data,
  removeTrainerSignature: async (trainerId: string) => (await apiClient.delete<AdminTrainer>(`/admin/trainers/${trainerId}/signature`)).data,

  // batches
  batches: async (filters: BatchFilters & PageQuery = {}) => (await apiClient.get<Paginated<BatchSummary>>('/admin/batches', { params: filters })).data,
  batch: async (batchId: string) => (await apiClient.get<BatchDetail>(`/admin/batches/${batchId}`)).data,
  createBatch: async (payload: BatchUpsertRequest) => (await apiClient.post<Batch>('/admin/batches', payload)).data,
  updateBatch: async (batchId: string, payload: BatchUpsertRequest) => (await apiClient.put<Batch>(`/admin/batches/${batchId}`, payload)).data,
  changeBatchStatus: async (batchId: string, status: BatchStatus, reason?: string) =>
    (await apiClient.post<Batch & { certificateResult?: BatchCertificateResult }>(`/admin/batches/${batchId}/status`, { status, reason })).data,
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
  certificateSettings: async () => (await apiClient.get<CertificateSettings>('/admin/certificate-settings')).data,
  updateCertificateSettings: async (payload: CertificateSettingsUpdate) =>
    (await apiClient.put<CertificateSettings>('/admin/certificate-settings', payload)).data,
  uploadCertificateImage: async (kind: CertificateImageKind, file: File) =>
    (await apiClient.post<CertificateSettings>(`/admin/certificate-settings/images/${kind}`, imageForm(file), multipart)).data,
  removeCertificateImage: async (kind: CertificateImageKind) =>
    (await apiClient.delete<CertificateSettings>(`/admin/certificate-settings/images/${kind}`)).data,
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
  courseReferralRules: async () => (await apiClient.get<CourseReferralTerms[]>('/admin/referrals/courses')).data,
  setCourseReferralRules: async (courseId: string, payload: CourseReferralSettingInput) =>
    (await apiClient.put<CourseReferralTerms>(`/admin/referrals/courses/${courseId}`, payload)).data,
  resetCourseReferralRules: async (courseId: string) => (await apiClient.delete<CourseReferralTerms>(`/admin/referrals/courses/${courseId}`)).data,

  // home page hero slider
  heroSlides: async () => (await apiClient.get<AdminHeroSlide[]>('/admin/hero-slides')).data,
  createHeroSlide: async (input: HeroSlideInput) => {
    const { body, config } = heroSlideRequest(input);
    return (await apiClient.post<AdminHeroSlide>('/admin/hero-slides', body, config)).data;
  },
  updateHeroSlide: async (slideId: string, input: HeroSlideInput) => {
    const { body, config } = heroSlideRequest(input);
    return (await apiClient.patch<AdminHeroSlide>(`/admin/hero-slides/${slideId}`, body, config)).data;
  },
  deleteHeroSlide: async (slideId: string) => {
    await apiClient.delete(`/admin/hero-slides/${slideId}`);
  },
  reorderHeroSlides: async (ids: string[]) => (await apiClient.put<AdminHeroSlide[]>('/admin/hero-slides/order', { ids })).data,
  uploadLogo: async (file: File, alt: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('alt', alt);
    return (await apiClient.post<SiteSettings>('/admin/site-logo', form, multipart)).data;
  },
  updateLogoAlt: async (alt: string) => (await apiClient.post<SiteSettings>('/admin/site-logo', { alt })).data,
  removeLogo: async () => (await apiClient.delete<SiteSettings>('/admin/site-logo')).data,
  updateSiteContact: async (payload: SiteContact) => (await apiClient.put<SiteSettings>('/admin/site-contact', payload)).data,
  policyHistory: async (slug: PolicySlug) => (await apiClient.get<PolicyVersion[]>(`/admin/policies/${slug}`)).data,
  publishPolicy: async (slug: PolicySlug, payload: { title: string; summary: string; content: string }) =>
    (await apiClient.post<PolicyVersion>(`/admin/policies/${slug}`, payload)).data,
  batchInterests: async (courseId?: string) =>
    (await apiClient.get<Array<{ id: string; courseId: string; courseTitle: string; name: string; email: string; createdAt: string; notifiedAt: string | null }>>('/admin/batch-interests', { params: courseId ? { courseId } : {} })).data,
  homeVideo: async () => (await apiClient.get<AdminHomeVideo>('/admin/home-video')).data,
  updateHomeVideo: async (input: HomeVideoInput) => (await apiClient.put<AdminHomeVideo>('/admin/home-video', input)).data,

  // audit
  auditLogs: async (filters: AuditLogFilters & PageQuery = {}) =>
    (await apiClient.get<Paginated<AuditLog>>('/admin/audit-logs', { params: filters })).data,
};
