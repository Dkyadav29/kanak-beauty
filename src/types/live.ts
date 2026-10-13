import type { ISODateString } from './common';

export type LiveSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type RecordingStatus = 'available' | 'processing' | 'unavailable';

export interface LiveSession {
  id: string;
  courseId: string;
  courseTitle: string;
  batchId: string | null;
  title: string;
  trainerId: string;
  trainerName: string;
  startsAt: ISODateString;
  durationMinutes: number;
  status: LiveSessionStatus;
  /** Minutes before start when entitled students may join. */
  joinWindowMinutesBefore: number;
  recordingId: string | null;
  description: string;
}

/** Student-facing session with entitlement flags computed by the backend. */
export interface StudentLiveSession extends LiveSession {
  isEnrolled: boolean;
  canJoinNow: boolean;
  joinOpensAt: ISODateString;
  joinClosesAt: ISODateString;
}

export interface JoinSessionResponse {
  /** Short-lived, backend-signed join URL for the configured conferencing provider. */
  joinUrl: string;
  provider: string;
  expiresAt: ISODateString;
}

export interface Recording {
  id: string;
  sessionId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  trainerName: string;
  recordedAt: ISODateString;
  durationMinutes: number;
  status: RecordingStatus;
  lessonId: string | null;
}

export interface RecordingPlaybackResponse {
  /** Signed, expiring stream URL issued by the backend after authorization. */
  streamUrl: string;
  expiresAt: ISODateString;
  resumePositionSeconds: number;
}

export interface LiveSessionUpsertRequest {
  courseId: string;
  batchId: string | null;
  title: string;
  trainerId: string;
  startsAt: string;
  durationMinutes: number;
  description: string;
  joinWindowMinutesBefore?: number;
}
