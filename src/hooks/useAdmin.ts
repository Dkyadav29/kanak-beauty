import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, type CurriculumModuleInput } from '@/services';
import type {
  AuditLogFilters,
  BatchFilters,
  BatchStatus,
  BatchUpsertRequest,
  CertificateFilters,
  CourseUpsertRequest,
  DateRangeFilter,
  EnrollmentFilters,
  LiveSessionUpsertRequest,
  PageQuery,
  PaymentFilters,
  ReferralFilters,
  ReferralProgramConfig,
  StudentFilters,
} from '@/types';
import { queryKeys } from './queryKeys';

const useInvalidateAdmin = () => {
  const qc = useQueryClient();
  return (...keys: ReadonlyArray<readonly unknown[]>) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    qc.invalidateQueries({ queryKey: queryKeys.admin.auditLogs() });
    qc.invalidateQueries({ queryKey: queryKeys.admin.overview() });
  };
};

// overview
export const useAdminOverview = (range: DateRangeFilter = {}) =>
  useQuery({ queryKey: queryKeys.admin.overview(range), queryFn: () => adminService.overview(range) });
export const useAdminAnalytics = (range: DateRangeFilter = {}) =>
  useQuery({ queryKey: queryKeys.admin.analytics(range), queryFn: () => adminService.analytics(range) });

// students
export const useAdminStudents = (filters: StudentFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.students(filters), queryFn: () => adminService.students(filters), placeholderData: (prev) => prev });
export const useAdminStudent = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.admin.student(id ?? ''), queryFn: () => adminService.student(id!), enabled: !!id });

// courses
export const useAdminCourses = (filters: { search?: string; status?: string } = {}) =>
  useQuery({ queryKey: queryKeys.admin.courses(filters), queryFn: () => adminService.courses(filters), placeholderData: (prev) => prev });
export const useAdminCourse = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.admin.course(id ?? ''), queryFn: () => adminService.course(id!), enabled: !!id });
export const useAdminTrainers = () => useQuery({ queryKey: queryKeys.admin.trainers, queryFn: adminService.trainers, staleTime: 5 * 60_000 });
export const useEnrolledStudents = (courseId: string | undefined) =>
  useQuery({ queryKey: queryKeys.admin.enrolledStudents(courseId ?? ''), queryFn: () => adminService.enrolledStudents(courseId!), enabled: !!courseId });

export const useCourseMutations = () => {
  const invalidate = useInvalidateAdmin();
  const done = (id?: string) => invalidate(queryKeys.admin.courses(), ...(id ? [queryKeys.admin.course(id)] : []), ['catalog']);
  return {
    create: useMutation({ mutationFn: (p: CourseUpsertRequest) => adminService.createCourse(p), onSuccess: () => done() }),
    update: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: CourseUpsertRequest }) => adminService.updateCourse(id, payload), onSuccess: (c) => done(c.id) }),
    publish: useMutation({ mutationFn: (id: string) => adminService.publishCourse(id), onSuccess: (c) => done(c.id) }),
    unpublish: useMutation({ mutationFn: (id: string) => adminService.unpublishCourse(id), onSuccess: (c) => done(c.id) }),
    curriculum: useMutation({
      mutationFn: ({ id, modules }: { id: string; modules: CurriculumModuleInput[] }) => adminService.updateCurriculum(id, modules),
      onSuccess: (c) => done(c.id),
    }),
  };
};

// batches
export const useAdminBatches = (filters: BatchFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.batches(filters), queryFn: () => adminService.batches(filters), placeholderData: (prev) => prev });
export const useAdminBatch = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.admin.batch(id ?? ''), queryFn: () => adminService.batch(id!), enabled: !!id });

export const useBatchMutations = () => {
  const invalidate = useInvalidateAdmin();
  const done = (id?: string) => invalidate(queryKeys.admin.batches(), ...(id ? [queryKeys.admin.batch(id)] : []), queryKeys.admin.sessions(), queryKeys.admin.enrollments());
  return {
    create: useMutation({ mutationFn: (p: BatchUpsertRequest) => adminService.createBatch(p), onSuccess: () => done() }),
    update: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: BatchUpsertRequest }) => adminService.updateBatch(id, payload), onSuccess: (b) => done(b.id) }),
    changeStatus: useMutation({
      mutationFn: ({ id, status, reason }: { id: string; status: BatchStatus; reason?: string }) => adminService.changeBatchStatus(id, status, reason),
      onSuccess: (b) => done(b.id),
    }),
    addStudent: useMutation({ mutationFn: ({ id, studentId }: { id: string; studentId: string }) => adminService.addBatchStudent(id, studentId), onSuccess: (_, v) => done(v.id) }),
    withdrawStudent: useMutation({
      mutationFn: ({ id, studentId, reason }: { id: string; studentId: string; reason?: string }) => adminService.withdrawBatchStudent(id, studentId, reason),
      onSuccess: (_, v) => done(v.id),
    }),
  };
};

// sessions
export const useAdminSessions = (filters: { batchId?: string; courseId?: string; scope?: 'all' | 'upcoming' } = {}) =>
  useQuery({ queryKey: queryKeys.admin.sessions(filters), queryFn: () => adminService.sessions(filters) });

export const useSessionMutations = () => {
  const invalidate = useInvalidateAdmin();
  const done = () => invalidate(queryKeys.admin.sessions(), queryKeys.admin.batches(), ['admin', 'batch'], queryKeys.admin.eligible, ['catalog']);
  return {
    create: useMutation({ mutationFn: (p: LiveSessionUpsertRequest) => adminService.createSession(p), onSuccess: done }),
    cancel: useMutation({ mutationFn: (id: string) => adminService.cancelSession(id), onSuccess: done }),
    attendance: useMutation({
      mutationFn: ({ id, records }: { id: string; records: Array<{ studentId: string; status: 'present' | 'absent' | 'late' }> }) => adminService.recordAttendance(id, records),
      onSuccess: done,
    }),
  };
};

// enrollments
export const useAdminEnrollments = (filters: EnrollmentFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.enrollments(filters), queryFn: () => adminService.enrollments(filters), placeholderData: (prev) => prev });

export const useEnrollmentMutations = () => {
  const invalidate = useInvalidateAdmin();
  const done = () => invalidate(queryKeys.admin.enrollments(), queryKeys.admin.students(), ['admin', 'student']);
  return {
    grant: useMutation({ mutationFn: (p: { studentId: string; courseId: string; reason: string }) => adminService.grantEnrollment(p), onSuccess: done }),
    setAccess: useMutation({
      mutationFn: ({ id, accessStatus, reason }: { id: string; accessStatus: 'active' | 'suspended'; reason: string }) => adminService.setEnrollmentAccess(id, accessStatus, reason),
      onSuccess: done,
    }),
  };
};

// payments
export const useAdminPayments = (filters: PaymentFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.payments(filters), queryFn: () => adminService.payments(filters), placeholderData: (prev) => prev });

export const usePaymentMutations = () => {
  const invalidate = useInvalidateAdmin();
  const done = () => invalidate(queryKeys.admin.payments(), queryKeys.admin.enrollments(), queryKeys.admin.batches(), ['admin', 'batch']);
  return {
    reconcile: useMutation({ mutationFn: (id: string) => adminService.reconcilePayment(id), onSuccess: done }),
    refund: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.refundPayment(id, reason), onSuccess: done }),
  };
};

// certificates
export const useAdminCertificates = (filters: CertificateFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.certificates(filters), queryFn: () => adminService.certificates(filters), placeholderData: (prev) => prev });
export const useAdminCertificate = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.admin.certificate(id ?? ''), queryFn: () => adminService.certificate(id!), enabled: !!id });
export const useEligibleStudents = () => useQuery({ queryKey: queryKeys.admin.eligible, queryFn: adminService.eligibleStudents });

export const useCertificateMutations = () => {
  const invalidate = useInvalidateAdmin();
  const done = () => invalidate(queryKeys.admin.certificates(), queryKeys.admin.eligible, ['admin', 'certificate'], ['admin', 'batch'], ['catalog', 'verify']);
  return {
    issue: useMutation({ mutationFn: (p: { studentId: string; courseId: string }) => adminService.issueCertificate(p), onSuccess: done }),
    revoke: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.revokeCertificate(id, reason), onSuccess: done }),
    reissue: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.reissueCertificate(id, reason), onSuccess: done }),
  };
};

// refer & earn
export const useAdminReferrals = (filters: ReferralFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.referrals(filters), queryFn: () => adminService.referrals(filters), placeholderData: (prev) => prev });
export const useReferralStats = () => useQuery({ queryKey: queryKeys.admin.referralStats, queryFn: adminService.referralStats });
export const useReferralConfig = () => useQuery({ queryKey: queryKeys.admin.referralConfig, queryFn: adminService.referralConfig });
export const useUpdateReferralConfig = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (p: Omit<ReferralProgramConfig, 'currency'>) => adminService.updateReferralConfig(p),
    onSuccess: () => invalidate(queryKeys.admin.referralConfig, queryKeys.admin.referralStats),
  });
};

// audit
export const useAuditLogs = (filters: AuditLogFilters & PageQuery = {}) =>
  useQuery({ queryKey: queryKeys.admin.auditLogs(filters), queryFn: () => adminService.auditLogs(filters), placeholderData: (prev) => prev });
