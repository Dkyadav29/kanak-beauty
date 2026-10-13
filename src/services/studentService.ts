import { apiClient, resolveApiUrl } from '@/lib/api/client';
import type {
  Certificate,
  ChangePasswordRequest,
  Course,
  CourseProgressSummary,
  EnrolledCourseView,
  JoinSessionResponse,
  PaymentTransaction,
  Recording,
  RecordingPlaybackResponse,
  ReferralSummary,
  StudentLiveSession,
  StudentProfile,
  UpdateLessonProgressRequest,
  UpdateProfileRequest,
} from '@/types';

export interface StudentDashboardData {
  stats: {
    totalEnrolled: number;
    active: number;
    upcomingLiveClasses: number;
    completed: number;
    certificates: number;
  };
  continueLearning: EnrolledCourseView | null;
  upcomingSessions: StudentLiveSession[];
  recentCourses: EnrolledCourseView[];
  recentCertificates: Certificate[];
}

export const studentService = {
  dashboard: async () => (await apiClient.get<StudentDashboardData>('/student/dashboard')).data,

  // profile
  profile: async () => (await apiClient.get<StudentProfile>('/student/profile')).data,
  updateProfile: async (payload: UpdateProfileRequest) => (await apiClient.patch<StudentProfile>('/student/profile', payload)).data,
  changePassword: async (payload: ChangePasswordRequest) => (await apiClient.post<{ message: string }>('/student/change-password', payload)).data,

  // courses & progress
  enrollments: async () => (await apiClient.get<EnrolledCourseView[]>('/student/enrollments')).data,
  course: async (courseId: string) => (await apiClient.get<Course>(`/student/courses/${courseId}`)).data,
  progress: async (courseId: string) => (await apiClient.get<CourseProgressSummary>(`/student/courses/${courseId}/progress`)).data,
  updateLessonProgress: async (courseId: string, lessonId: string, payload: UpdateLessonProgressRequest) =>
    (await apiClient.put<CourseProgressSummary>(`/student/courses/${courseId}/lessons/${lessonId}/progress`, payload)).data,

  // live
  liveSessions: async (scope: 'upcoming' | 'past' | 'all' = 'upcoming') =>
    (await apiClient.get<StudentLiveSession[]>('/student/live-sessions', { params: { scope } })).data,
  joinSession: async (sessionId: string) => (await apiClient.post<JoinSessionResponse>(`/student/live-sessions/${sessionId}/join`)).data,

  // recordings
  recordings: async (filters: { courseId?: string; from?: string; to?: string } = {}) =>
    (await apiClient.get<Recording[]>('/student/recordings', { params: filters })).data,
  playback: async (recordingId: string) => {
    const data = (await apiClient.post<RecordingPlaybackResponse>(`/student/recordings/${recordingId}/playback`)).data;
    // The stream path is relative to the API host; <video src> needs an absolute URL.
    return { ...data, streamUrl: resolveApiUrl(data.streamUrl) };
  },

  // payments
  payments: async () => (await apiClient.get<PaymentTransaction[]>('/student/payments')).data,
  payment: async (paymentId: string) => (await apiClient.get<PaymentTransaction>(`/student/payments/${paymentId}`)).data,

  // refer & earn
  referrals: async () => (await apiClient.get<ReferralSummary>('/student/referrals')).data,

  // certificates
  certificates: async () => (await apiClient.get<Certificate[]>('/student/certificates')).data,
  certificate: async (certificateId: string) => (await apiClient.get<Certificate>(`/student/certificates/${certificateId}`)).data,
};
