import { apiClient } from '@/lib/api/client';
import type { CertificateVerificationResult, Course, CourseFilters, CourseSummary, LiveSession, ReferralCodeValidation, Trainer } from '@/types';

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
  getCourse: async (idOrSlug: string) => (await apiClient.get<Course>(`/courses/${encodeURIComponent(idOrSlug)}`)).data,
  getCourseSessions: async (idOrSlug: string) => (await apiClient.get<LiveSession[]>(`/courses/${encodeURIComponent(idOrSlug)}/sessions`)).data,
  upcomingSessions: async (limit = 8) => (await apiClient.get<LiveSession[]>('/live-sessions/upcoming', { params: { limit } })).data,
  trainers: async () => (await apiClient.get<Trainer[]>('/trainers')).data,
  stats: async () => (await apiClient.get<AcademyStats>('/academy/stats')).data,
  validateReferral: async (code: string) => (await apiClient.get<ReferralCodeValidation>(`/referrals/validate/${encodeURIComponent(code)}`)).data,
  verifyCertificate: async (certificateNumber: string) =>
    (await apiClient.get<CertificateVerificationResult>(`/certificates/verify/${encodeURIComponent(certificateNumber)}`)).data,
};
