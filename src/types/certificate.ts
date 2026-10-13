import type { ISODateString } from './common';

export type CertificateStatus = 'issued' | 'revoked';

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  batchId: string | null;
  completionDate: ISODateString;
  issuedAt: ISODateString;
  issuedBy: string;
  status: CertificateStatus;
  revokedAt: ISODateString | null;
  revokedReason: string | null;
  verificationUrl: string;
}

export interface CertificateVerificationResult {
  valid: boolean;
  status: CertificateStatus | 'not_found';
  certificate: Pick<
    Certificate,
    'certificateNumber' | 'studentName' | 'courseTitle' | 'completionDate' | 'issuedAt' | 'issuedBy' | 'status'
  > | null;
  checkedAt: ISODateString;
}

export interface EligibleStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  batchId: string | null;
  completedAt: ISODateString;
  evidence: {
    requiredLessonsCompleted: string;
    liveAttendancePercent: number | null;
    assessmentPassed: boolean | null;
  };
}

export interface IssueCertificateRequest {
  studentId: string;
  courseId: string;
}

export interface RevokeCertificateRequest {
  reason: string;
}

export interface CertificateFilters {
  search?: string;
  status?: CertificateStatus | 'all';
  courseId?: string;
}
