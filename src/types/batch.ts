import type { ISODateString } from './common';

export type BatchStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'archived';
export type BatchEnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'withdrawn';

export interface Batch {
  id: string;
  code: string;
  name: string;
  courseId: string;
  trainerId: string;
  startDate: ISODateString;
  endDate: ISODateString;
  capacity: number;
  status: BatchStatus;
  scheduleNote: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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
  trainerName: string;
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
  trainerId: string;
  startDate: string;
  endDate: string;
  capacity: number;
  scheduleNote: string;
  status?: BatchStatus;
}

export interface BatchFilters {
  search?: string;
  courseId?: string;
  trainerId?: string;
  status?: BatchStatus | 'all';
  startFrom?: string;
  startTo?: string;
}
