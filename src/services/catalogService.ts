import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { CertificateVerificationResult, Course, CourseBatches, CourseCategory, CourseFilters, CourseSummary, LiveSession, PolicySlug, PolicyVersion, PublicHeroSlide, PublicHomeVideo, ReferralCodeValidation, SiteSettings, Trainer } from '@/types';

export interface AcademyStats {
  coursesOffered: number;
  enrolledStudents: number;
  expertTrainers: number;
  certificatesIssued: number;
  coursesCompleted: number;
  isDemoData: boolean;
}

export const catalogService = {
  listCourses: async (filters: CourseFilters & { featured?: boolean } = {}) =>
    (await apiClient.get<CourseSummary[]>('/courses', { params: filters })).data,
  categories: async () => (await apiClient.get<CourseCategory[]>('/course-categories')).data,
  getCourse: async (idOrSlug: string) => (await apiClient.get<Course>(`/courses/${encodeURIComponent(idOrSlug)}`)).data,
  getCourseSessions: async (idOrSlug: string) => (await apiClient.get<LiveSession[]>(`/courses/${encodeURIComponent(idOrSlug)}/sessions`)).data,
  upcomingSessions: async (limit = 8) => (await apiClient.get<LiveSession[]>('/live-sessions/upcoming', { params: { limit } })).data,
  trainers: async () => (await apiClient.get<Trainer[]>('/trainers')).data,
  stats: async () => (await apiClient.get<AcademyStats>('/academy/stats')).data,
  heroSlides: async () => (await apiClient.get<PublicHeroSlide[]>('/hero-slides')).data,
  homeVideo: async () => (await apiClient.get<PublicHomeVideo>('/home-video')).data,
  siteSettings: async () => (await apiClient.get<SiteSettings>('/site-settings')).data,
  /** Current published version, or null until an admin publishes one. */
  policy: async (slug: PolicySlug): Promise<PolicyVersion | null> => {
    try {
      return (await apiClient.get<PolicyVersion>(`/policies/${slug}`)).data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  courseBatches: async (idOrSlug: string) => (await apiClient.get<CourseBatches>(`/courses/${encodeURIComponent(idOrSlug)}/batches`)).data,
  batchInterest: async (idOrSlug: string, payload: { email?: string; name?: string }) =>
    (await apiClient.post<{ registered: boolean }>(`/courses/${encodeURIComponent(idOrSlug)}/batch-interest`, payload)).data,
  validateReferral: async (code: string) => (await apiClient.get<ReferralCodeValidation>(`/referrals/validate/${encodeURIComponent(code)}`)).data,
  verifyCertificate: async (certificateNumber: string) =>
    (await apiClient.get<CertificateVerificationResult>(`/certificates/verify/${encodeURIComponent(certificateNumber)}`)).data,
};
