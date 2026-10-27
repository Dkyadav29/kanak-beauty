import type { ISODateString } from './common';

export type BatchStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'archived';
export type BatchEnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'withdrawn';

export interface Batch {
  id: string;
  code: string;
  name: string;
  courseId: string;
  /** Null until a trainer is assigned. */
  trainerId: string | null;
  startDate: ISODateString;
  endDate: ISODateString;
  /** Daily class time, "HH:MM:SS". Null only on batches created before times were captured. */
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  status: BatchStatus;
  scheduleNote: string;
  /** Admin responses only. Students get links via StudentBatch, and only when verified. */
  meetLink: string;
  recordingLink: string;
  /** Last day students can choose this batch; null = the start date. */
  enrollmentDeadline: ISODateString | null;
  /** Admin override: keep accepting enrollments after the deadline/start (never when full). */
  allowLateEnrollment: boolean;
  /** '' = the course's format. */
  deliveryMode: '' | 'live' | 'recorded' | 'hybrid';
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** GET /courses/:idOrSlug/batches: an upcoming batch as shown when enrolling (no links). */
export interface PublicBatch {
  id: string;
  code: string;
  name: string;
  courseId: string;
  startDate: ISODateString;
  endDate: ISODateString;
  startTime: string | null;
  endTime: string | null;
  scheduleNote: string;
  status: BatchStatus;
  trainerName: string | null;
  deliveryMode: 'live' | 'recorded' | 'hybrid';
  capacity: number;
  enrollmentDeadline: ISODateString;
  seatsLeft: number;
  isOpen: boolean;
  closedReason: 'full' | 'deadline_passed' | 'started' | 'closed' | null;
}

export interface CourseBatches {
  /** False only for self-paced courses without open batches (purchase without a batch). */
  batchRequired: boolean;
  batches: PublicBatch[];
}

export interface BatchEnrollment {
  id: string;
  batchId: string;
  studentId: string;
  status: BatchEnrollmentStatus;
  enrolledAt: ISODateString;
  completedAt: ISODateString | null;
  withdrawnAt: ISODateString | null;
}

export interface BatchSummary extends Batch {
  courseTitle: string;
  trainerName: string | null;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  withdrawnStudents: number;
  sessionCount: number;
}

export type BatchHistoryEventType =
  | 'batch_created'
  | 'batch_updated'
  | 'status_changed'
  | 'student_added'
  | 'student_withdrawn'
  | 'student_completed'
  | 'session_scheduled'
  | 'session_completed'
  | 'session_cancelled'
  | 'attendance_recorded'
  | 'certificate_issued'
  | 'certificate_revoked';

export interface BatchHistoryEvent {
  id: string;
  batchId: string;
  type: BatchHistoryEventType;
  description: string;
  actorId: string | null;
  actorName: string;
  at: ISODateString;
}

export interface BatchStudentRow {
  enrollment: BatchEnrollment;
  studentId: string;
  studentName: string;
  studentEmail: string;
  progressPercent: number;
  attendancePercent: number | null;
  certificateNumber: string | null;
}

export interface BatchDetail extends BatchSummary {
  students: BatchStudentRow[];
  history: BatchHistoryEvent[];
  sessionIds: string[];
}

export interface BatchUpsertRequest {
  name: string;
  courseId: string;
  /** Required; must be an active trainer (or the batch's current one). */
  trainerId: string;
  startDate: string;
  endDate: string;
  /** "HH:MM" */
  startTime: string;
  endTime: string;
  capacity: number;
  scheduleNote: string;
  /** Optional; must be a https://meet.google.com/... link. */
  meetLink: string;
  /** Optional https link to the session recording. */
  recordingLink: string;
  enrollmentDeadline?: string | null;
  allowLateEnrollment?: boolean;
  deliveryMode?: '' | 'live' | 'recorded' | 'hybrid';
  status?: BatchStatus;
}

/**
 * upcoming: starts in the future. live: running now. completed: ended, closed, or finished by the
 * student. GET /student/batches?phase= also accepts "current" (upcoming + live).
 */
export type StudentBatchPhase = 'upcoming' | 'live' | 'completed';

/**
 * A batch the signed-in student is a verified member of (GET /student/batches).
 * The backend only returns batches for an active, paid (or admin-granted) enrollment.
 */
export interface StudentBatch {
  id: string;
  code: string;
  name: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  /** Where the batch stands for this student; "completed" also covers a finished course. */
  phase: StudentBatchPhase;
  /** The student's enrollment in this course is marked completed. */
  courseCompleted: boolean;
  trainerName: string | null;
  startDate: ISODateString;
  endDate: ISODateString;
  startTime: string | null;
  endTime: string | null;
  scheduleNote: string;
  status: BatchStatus;
  /** Null when not set or once the batch has ended. */
  meetLink: string | null;
  recordingLink: string | null;
}

/** Returned when a batch is completed: certificates issued automatically to verified members. */
export interface BatchCertificateResult {
  issued: number;
  alreadyIssued: number;
  /** Members without a received payment / active enrollment, or certificates disabled for the course. */
  skipped: number;
}

export interface BatchFilters {
  search?: string;
  courseId?: string;
  trainerId?: string;
  status?: BatchStatus | 'all';
  startFrom?: string;
  startTo?: string;
}
