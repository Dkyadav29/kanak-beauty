import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService, studentService } from '@/services';
import type { ChangePasswordRequest, UpdateLessonProgressRequest, UpdateProfileRequest } from '@/types';
import { queryKeys } from './queryKeys';

export const useStudentDashboard = () => useQuery({ queryKey: queryKeys.student.dashboard, queryFn: studentService.dashboard });

export const useStudentProfile = () => useQuery({ queryKey: queryKeys.student.profile, queryFn: studentService.profile });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => studentService.updateProfile(payload),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.student.profile, data);
      qc.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
};

export const useChangePassword = () => useMutation({ mutationFn: (payload: ChangePasswordRequest) => studentService.changePassword(payload) });

export const useEnrollments = () => useQuery({ queryKey: queryKeys.student.enrollments, queryFn: studentService.enrollments });

export const useStudentCourse = (courseId: string | undefined) =>
  useQuery({ queryKey: queryKeys.student.course(courseId ?? ''), queryFn: () => studentService.course(courseId!), enabled: !!courseId, retry: false });

export const useCourseProgress = (courseId: string | undefined) =>
  useQuery({ queryKey: queryKeys.student.progress(courseId ?? ''), queryFn: () => studentService.progress(courseId!), enabled: !!courseId, retry: false });

export const useUpdateLessonProgress = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, payload }: { lessonId: string; payload: UpdateLessonProgressRequest }) =>
      studentService.updateLessonProgress(courseId, lessonId, payload),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.student.progress(courseId), data);
      qc.invalidateQueries({ queryKey: queryKeys.student.enrollments });
      qc.invalidateQueries({ queryKey: queryKeys.student.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.student.certificates });
    },
  });
};

export const useStudentLiveSessions = (scope: 'upcoming' | 'past' | 'all' = 'upcoming') =>
  useQuery({ queryKey: queryKeys.student.liveSessions(scope), queryFn: () => studentService.liveSessions(scope), refetchInterval: 60_000 });

export const useJoinSession = () => useMutation({ mutationFn: (sessionId: string) => studentService.joinSession(sessionId) });

export const useRecordings = (filters: { courseId?: string; from?: string; to?: string } = {}) =>
  useQuery({ queryKey: queryKeys.student.recordings(filters), queryFn: () => studentService.recordings(filters) });

export const usePlayback = () => useMutation({ mutationFn: (recordingId: string) => studentService.playback(recordingId) });

export const useStudentPayments = () => useQuery({ queryKey: queryKeys.student.payments, queryFn: studentService.payments });

export const useStudentPayment = (paymentId: string | undefined, options: { poll?: boolean } = {}) =>
  useQuery({
    queryKey: queryKeys.student.payment(paymentId ?? ''),
    queryFn: () => studentService.payment(paymentId!),
    enabled: !!paymentId,
    refetchInterval: options.poll ? (q) => (q.state.data?.status === 'pending' ? 1500 : false) : false,
  });

export const useReferralSummary = () => useQuery({ queryKey: queryKeys.student.referrals, queryFn: studentService.referrals });

export const useStudentCertificates = () => useQuery({ queryKey: queryKeys.student.certificates, queryFn: studentService.certificates });

export const useStudentCertificate = (certificateId: string | undefined) =>
  useQuery({ queryKey: queryKeys.student.certificate(certificateId ?? ''), queryFn: () => studentService.certificate(certificateId!), enabled: !!certificateId });

export const useCreateOrder = () =>
  useMutation({ mutationFn: (payload: { courseId: string; applyWalletCredit?: boolean }) => paymentService.createOrder(payload) });

export const useCompleteSandboxCheckout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { checkoutToken: string; outcome: 'success' | 'failure'; method: string }) => paymentService.completeSandboxCheckout(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.student.all });
    },
  });
};
