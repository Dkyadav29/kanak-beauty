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
  /** Detail endpoints only: what the template prints besides student, course and number. */
  design?: CertificateDesign;
}

/** Printed people and text. Images are data: URIs (null when not uploaded). */
export interface CertificateDesign {
  durationLabel: string;
  trainerName: string;
  trainerTitle: string;
  trainerSignature: string | null;
  signatoryName: string;
  signatoryTitle: string;
  signatorySignature: string | null;
  signatoryStamp: string | null;
  registrationLabel: string;
  registrationNumber: string;
  registrationLogo: string | null;
  organisationName: string;
  appreciationText: string;
}

/** GET/PUT /admin/certificate-settings. Applies to certificates issued from now on. */
export interface CertificateSettings {
  organisationName: string;
  /** 2-6 letters, e.g. KBS -> KBS-AHC-20261025-1C9FAF-032 */
  numberPrefix: string;
  appreciationText: string;
  signatoryName: string;
  signatoryTitle: string;
  signatorySignature: string | null;
  signatoryStamp: string | null;
  registrationLabel: string;
  registrationNumber: string;
  registrationLogo: string | null;
  updatedAt: string;
}

export type CertificateSettingsUpdate = Pick<
  CertificateSettings,
  'organisationName' | 'numberPrefix' | 'appreciationText' | 'signatoryName' | 'signatoryTitle' | 'registrationLabel' | 'registrationNumber'
>;

export type CertificateImageKind = 'signature' | 'stamp' | 'registration-logo';

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
