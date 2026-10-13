# Kanak Beauty Academy — Backend API Contracts

This document defines the HTTP API the React frontend integrates with. The Django backend in `backend/` implements it; the frontend points at it through `VITE_API_BASE_URL`.

All request/response shapes are the TypeScript interfaces in `src/types/`. Dates are ISO-8601 strings. Money is an integer amount in the smallest display unit the academy uses (the UI formats INR without decimals) plus a `currency` code.

## Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `VITE_API_BASE_URL`, e.g. `https://api.kanakacademy.example/api/v1` |
| Auth | `Authorization: Bearer <accessToken>`. The token is opaque to the client. Prefer short-lived access tokens with an httpOnly refresh cookie; the client stores only the access token. |
| Identity | The backend resolves the user, role and permissions from the token on every request. The client never sends a role. |
| Errors | Non-2xx responses return `{ code: string, message: string, details?: Record<string, string[]> }`. `message` must be user-safe (no stack traces). `details` maps field names to validation messages. |
| 401 vs 403 vs 404 | 401 = no/expired session (client clears session and redirects to login). 403 = authenticated but not permitted. 404 = not found. Ownership failures on student resources return 404 so IDs cannot be enumerated. |
| Pagination | List endpoints accept `page` (1-based) and `pageSize` (max 100) and return `{ items, total, page, pageSize }`. |
| Rate limiting | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/verify-otp`: 5 failed attempts per identifier per 10 minutes → 429. |
| CSRF | If cookies are used for refresh tokens, protect state-changing routes with SameSite cookies plus a CSRF token or double-submit cookie. The axios client sends `withCredentials: true`. |
| Audit | Every admin mutation writes an `AuditLog` row (actor, action, entity, details, timestamp). |

## Permissions

Returned on the user object (`User.permissions`) and enforced server-side.

| Role | Permissions |
| --- | --- |
| student | `profile:read:self`, `profile:update:self`, `courses:read:enrolled`, `live:join`, `recordings:watch`, `progress:update:self`, `payments:read:self`, `certificates:read:self` |
| admin | `analytics:read`, `students:read`, `students:manage`, `courses:manage`, `batches:manage`, `enrollments:read`, `enrollments:manage`, `payments:read`, `payments:reconcile`, `certificates:manage`, `audit:read` |

`:self` permissions are always scoped to the caller's own records.

## Authentication

| Method & path | Auth | Body → Response | Notes |
| --- | --- | --- | --- |
| `POST /auth/register` | none | `RegisterRequest` → `RegisterResponse` | Role is always `student`. Sends OTP/email verification. 409 `EMAIL_TAKEN`. Password policy ≥ 8 chars, letter + digit (server-validated; use bcrypt/argon2). |
| `POST /auth/resend-otp` | none | `{ email }` → `{ message }` | Always 200 (no enumeration). |
| `POST /auth/verify-otp` | none | `VerifyOtpRequest` → `AuthSession` | 400 `INVALID_OTP`. |
| `POST /auth/login` | none | `LoginRequest` → `AuthSession` | 401 `INVALID_CREDENTIALS`, 403 `EMAIL_NOT_VERIFIED`, 403 `ACCOUNT_DISABLED`, 429 `RATE_LIMITED`. |
| `POST /auth/logout` | bearer | → `{ success }` | Revokes the token / refresh cookie. |
| `GET /auth/me` | bearer | → `User` | Called on every app boot. |
| `POST /auth/forgot-password` | none | `{ email }` → `{ message }` | Always 200. Emails a single-use link valid ~30 min. (With `DEBUG=True` the backend also returns `devResetToken`; never in production.) |
| `POST /auth/reset-password` | none | `ResetPasswordRequest` → `{ message }` | Invalidates all sessions for the user. |

## Public catalogue (no auth)

| Method & path | Response | Notes |
| --- | --- | --- |
| `GET /courses?search&level&format&featured` | `CourseSummary[]` | Published courses only. |
| `GET /courses/:idOrSlug` | `Course` | Published only; lesson `materials` stripped; 404 otherwise. |
| `GET /courses/:idOrSlug/sessions` | `LiveSession[]` | Upcoming scheduled sessions for the course (no join info). |
| `GET /live-sessions/upcoming?limit` | `LiveSession[]` | Next 45 days across published courses. |
| `GET /trainers` | `Trainer[]` | |
| `GET /academy/stats` | `{ coursesOffered, enrolledStudents, expertTrainers, certificatesIssued, coursesCompleted, isDemoData }` | Computed from real records. |
| `GET /certificates/verify/:number` | `CertificateVerificationResult` | `valid` is false for revoked or unknown numbers. Case-insensitive. |
| `POST /contact` | `{ name, email, mobile, message }` → `{ received }` | **Not yet implemented** in the backend; the Contact page shows a notice instead of sending. |

## Student (bearer, role `student`)

Every endpoint returns only the caller's own data. Access to course content requires an enrollment with `accessStatus === 'active'`.

| Method & path | Permission | Response | Rules |
| --- | --- | --- | --- |
| `GET /student/dashboard` | auth | `StudentDashboardData` (see `studentService.ts`) | Stats computed server-side. |
| `GET /student/profile` | `profile:read:self` | `StudentProfile` | |
| `PATCH /student/profile` | `profile:update:self` | `StudentProfile` | Accepts `UpdateProfileRequest`. Email and role are not editable here. Avatar: `avatarUrl` accepts an https URL or a bounded data URL (the frontend downscales the photo before sending); a multipart upload endpoint can replace this later. |
| `POST /student/change-password` | `profile:update:self` | `{ message }` | 400 `INVALID_PASSWORD`. |
| `GET /student/enrollments` | `courses:read:enrolled` | `EnrolledCourseView[]` | Excludes `pending_payment`. |
| `GET /student/courses/:courseId` | `courses:read:enrolled` | `Course` | 403 `NOT_ENROLLED` unless active enrollment. |
| `GET /student/courses/:courseId/progress` | `courses:read:enrolled` | `CourseProgressSummary` | Completion eligibility computed server-side. |
| `PUT /student/courses/:courseId/lessons/:lessonId/progress` | `progress:update:self` | `CourseProgressSummary` | `UpdateLessonProgressRequest`. `live` lessons cannot be completed manually (403); they complete via attendance. After saving, the backend evaluates completion (below). |
| `GET /student/live-sessions?scope=upcoming|past|all` | `courses:read:enrolled` | `StudentLiveSession[]` | Only sessions for courses/batches the student belongs to; includes `canJoinNow`, `joinOpensAt`, `joinClosesAt`. |
| `POST /student/live-sessions/:id/join` | `live:join` | `JoinSessionResponse` | 403 `NOT_ENROLLED`, 403 `OUTSIDE_JOIN_WINDOW`, 409 `SESSION_CANCELLED`. Returns a short-lived signed provider URL (Zoom/Meet/etc.). Never exposes host keys or static meeting passwords. |
| `GET /student/recordings?courseId&from&to` | `recordings:watch` | `Recording[]` | Includes `processing`/`unavailable` entries so the UI can label them. |
| `POST /student/recordings/:id/playback` | `recordings:watch` | `RecordingPlaybackResponse` | 403 unless entitled; 409 `RECORDING_UNAVAILABLE`. Returns a signed, expiring stream URL plus resume position. |
| `GET /student/payments` | `payments:read:self` | `PaymentTransaction[]` | |
| `GET /student/payments/:id` | `payments:read:self` | `PaymentTransaction` | 404 for another student's payment. The checkout page polls this until status ≠ `pending`. |
| `GET /student/payments/:id/invoice` | `payments:read:self` | `{ downloadUrl }` | **Optional**; not implemented yet. Signed PDF URL. |
| `GET /student/certificates` | `certificates:read:self` | `Certificate[]` | Includes revoked (status visible). |
| `GET /student/certificates/:id` | `certificates:read:self` | `Certificate` | |
| `GET /student/certificates/:id/download` | `certificates:read:self` | `{ downloadUrl }` | **Optional**; not implemented yet. Official PDF from the certificate service. The UI falls back to print-to-PDF of the preview. |

## Payments

```
Student                     Backend                         Gateway
  │ POST /payments/orders ───▶ create PENDING payment
  │ ◀── { orderId, paymentId, gateway.checkoutToken }
  │ redirect / SDK ───────────────────────────────────────▶ collect payment
  │                           ◀── POST /payments/webhook (signed) ──┘
  │                           verify signature, mark PAID,
  │                           create/activate enrollment (one tx, idempotent)
  │ GET /student/payments/:id (poll) ──▶ status: paid
```

| Method & path | Auth | Rules |
| --- | --- | --- |
| `POST /payments/orders` | student | Body `{ courseId }`. 404 unknown/unpublished course. 409 `ALREADY_ENROLLED` if an active enrollment exists. Reuses a pending order for the same course created within 30 min (idempotency). Response `CreateOrderResponse` — never includes gateway secrets. |
| `POST /payments/webhook` | gateway signature header | Verify HMAC over the raw body with the gateway secret (sandbox header: `x-kanak-signature`). Repeated deliveries are idempotent. On `paid`: set `paidAt`, `invoiceAvailable`, then upsert exactly one enrollment per (student, course) with `accessStatus='active'`, inside a DB transaction with a unique constraint on (studentId, courseId). On `failed`: record `failureReason`; grant nothing. |
| `POST /payments/sandbox/complete` | student | **Sandbox gateway only** (backend `PAYMENT_GATEWAY=sandbox`). Simulates the hosted checkout outcome and runs the webhook processor. The route is not registered for real gateways. |

Frontend guarantees: the success screen is shown only after `GET /student/payments/:id` returns `paid`; no client state grants access.

## Admin (bearer, role `admin`)

| Method & path | Permission | Response / rules |
| --- | --- | --- |
| `GET /admin/overview?from&to` | `analytics:read` | `AdminOverviewStats` filtered by date range. |
| `GET /admin/analytics?from&to` | `analytics:read` | `AdminAnalytics` (revenue by month, enrollments by course). |
| `GET /admin/students?search&courseId&batchId&paymentStatus&enrollmentStatus&page&pageSize` | `students:read` | `Paginated<StudentDirectoryRow>`. Search by name, email, mobile. |
| `GET /admin/students/:id` | `students:read` | `StudentDetailAdminView`. Never includes password hashes, tokens or payment secrets. |
| `GET /admin/courses?search&status` | `courses:manage` | `CourseSummary[]` all statuses. |
| `GET /admin/courses/:id` | `courses:manage` | `Course` |
| `POST /admin/courses` | `courses:manage` | `CourseUpsertRequest` → `Course`. Validates discount < price. Audit `course.create`. |
| `PUT /admin/courses/:id` | `courses:manage` | `CourseUpsertRequest` → `Course`. Audit `course.update`. |
| `POST /admin/courses/:id/publish` / `unpublish` | `courses:manage` | 409 `EMPTY_CURRICULUM` when publishing without lessons. Audit. |
| `PUT /admin/courses/:id/modules` | `courses:manage` | `{ modules: CurriculumModuleInput[] }` → `Course`. Replaces curriculum structure, preserving ids. Audit `course.curriculum`. |
| `POST /admin/courses/:id/thumbnail` | `courses:manage` | Multipart upload → `{ url }`; the editor currently accepts a URL. |
| `GET /admin/courses/:id/enrolled-students` | `batches:manage` | Students with active access (for adding to batches). |
| `GET /admin/trainers` | `courses:manage` | `Trainer[]` |
| `GET /admin/batches?search&courseId&trainerId&status&startFrom&startTo&page&pageSize` | `batches:manage` | `Paginated<BatchSummary>` — includes completed/cancelled/archived (Batch History uses this). |
| `GET /admin/batches/:id` | `batches:manage` | `BatchDetail` with students, attendance %, certificates, full `history` timeline and session ids. Available for archived batches. |
| `POST /admin/batches` | `batches:manage` | `BatchUpsertRequest` → `Batch` (status `scheduled`). History + audit. |
| `PUT /admin/batches/:id` | `batches:manage` | 409 `ARCHIVED` (read-only). |
| `POST /admin/batches/:id/status` | `batches:manage` | `{ status, reason? }`. Transitions: scheduled→active/cancelled; active→completed/cancelled; completed/cancelled→archived. Cancelling cancels scheduled sessions. Nothing is deleted. |
| `POST /admin/batches/:id/students` | `batches:manage` | `{ studentId }`. Requires active course enrollment (409 `NOT_ELIGIBLE`), capacity (409 `FULL`), no duplicate (409 `DUPLICATE`), batch not closed (409 `BATCH_CLOSED`). |
| `POST /admin/batches/:id/students/:studentId/withdraw` | `batches:manage` | `{ reason? }`. 409 if already completed. |
| `GET /admin/live-sessions?batchId&courseId&scope` | `batches:manage` | `LiveSession[]` |
| `POST /admin/live-sessions` | `batches:manage` | `LiveSessionUpsertRequest` → `LiveSession`. Batch must belong to course. |
| `POST /admin/live-sessions/:id/cancel` | `batches:manage` | 409 if completed. |
| `POST /admin/live-sessions/:id/attendance` | `batches:manage` | `{ records: [{ studentId, status }] }`. Marks session completed, upserts `AttendanceRecord`s, completes the matching live lesson for present/late students, then evaluates course completion for each student. |
| `GET /admin/enrollments?search&courseId&paymentStatus&accessStatus&page&pageSize` | `enrollments:read` | `Paginated<EnrollmentAdminRow>` |
| `POST /admin/enrollments/grant` | `enrollments:manage` | `{ studentId, courseId, reason }` → row. Source `admin_grant`. 409 if active. Audited. |
| `POST /admin/enrollments/:id/access` | `enrollments:manage` | `{ accessStatus: 'active'|'suspended', reason }`. Cannot touch `revoked`/`pending_payment`. Audited. |
| `GET /admin/payments?search&status&from&to&page&pageSize` | `payments:read` | `Paginated<PaymentTransaction>` |
| `POST /admin/payments/:id/reconcile` | `payments:reconcile` | Re-queries the gateway for the authoritative status; may transition pending→paid/failed **only** based on the gateway's answer. Returns `{ payment, gatewayStatus, changed }`. Audited. There is no endpoint to set `paid` manually. |
| `POST /admin/payments/:id/refund` | `payments:reconcile` | `{ reason }`. Only `paid` → `refunded`; revokes enrollment access and withdraws from batch. Audited. |
| `GET /admin/certificates?search&status&courseId&page&pageSize` | `certificates:manage` | `Paginated<Certificate>` |
| `GET /admin/certificates/:id` | `certificates:manage` | `Certificate` |
| `GET /admin/certificates/eligible/list` | `certificates:manage` | `EligibleStudent[]` — meet criteria, certificate-enabled course, no active certificate. |
| `POST /admin/certificates/issue` | `certificates:manage` | `{ studentId, courseId }`. Re-verifies eligibility (409 `NOT_ELIGIBLE`), one active certificate per student+course (409 `ALREADY_ISSUED`). Audited. |
| `POST /admin/certificates/:id/revoke` | `certificates:manage` | `{ reason }` (≥ 5 chars). Audited; batch history event. |
| `POST /admin/certificates/:id/reissue` | `certificates:manage` | `{ reason }`. Only revoked certificates; eligibility re-checked; new number issued. Audited. |
| `GET /admin/audit-logs?search&entityType&from&to&page&pageSize` | `audit:read` | `Paginated<AuditLog>` |

## Refer & Earn

Every student has a unique `referralCode`. A new student may register with a friend's code (`RegisterRequest.referralCode`). Rewards are driven entirely by the payment webhook, never by the client.

| Method & path | Auth | Rules |
| --- | --- | --- |
| `GET /referrals/validate/:code` | none | `ReferralCodeValidation`. Reveals only whether the code is valid, the referrer's first name and the welcome discount. Rate-limit like auth endpoints. |
| `POST /auth/register` (with `referralCode`) | none | Invalid or disabled code → 400 `INVALID_REFERRAL_CODE` with `details.referralCode`. Valid code → user `referredBy` set and a `Referral` row (`signed_up`) created. Self-referral is impossible at registration; the backend should also reject codes belonging to the same email/mobile. |
| `GET /student/referrals` | `referrals:read:self` | `ReferralSummary`: programme config, own code and link (built from the `X-Public-Origin` header or the configured site URL), stats, referrals and the wallet ledger. Referee emails may be masked. |
| `POST /payments/orders` (`applyWalletCredit`) | student | Pricing is computed server-side: `referralDiscount` applies to a referred student's **first** confirmed purchase; `walletCreditApplied` = min(balance, `maxCreditPerOrder`, remaining amount) when requested. The response echoes `listPrice`, `referralDiscount`, `walletCreditApplied` and the payable `amount`. |
| `POST /payments/webhook` → paid | signature | In the same transaction: redeem reserved wallet credit (negative ledger entry), and if the payer has a `signed_up` referral and no earlier paid purchase, mark it `rewarded` and credit `referrerRewardAmount` to the referrer's wallet. |
| `POST /admin/payments/:id/refund` | `payments:reconcile` | Reverses the referrer reward for that payment (`reversed` entry, referral → `cancelled`) and restores any credit redeemed on the order. |
| `GET /admin/referrals?search&status&page&pageSize` | `referrals:manage` | `Paginated<ReferralAdminRow>` |
| `GET /admin/referrals/stats` | `referrals:manage` | `ReferralAdminStats` (totals, conversion rate, credited, redeemed, outstanding wallet liability). |
| `GET /admin/referrals/config` / `PUT` | `referrals:manage` | `ReferralProgramConfig`. Amounts are whole numbers 0–100000. Updates are audited (`referrals.config`). |

Data model additions: `Referral` (unique per referee), `ReferralReward` ledger (append-only; wallet balance is the sum of entries), `ReferralProgramConfig`. Constraints: unique `referralCode` per user; unique `refereeId` on `Referral`; a reward is credited at most once per referral.

## Completion and certificate rules (server-side)

1. `CourseProgressSummary.completionEligible` is true only when the enrollment is active and all configured criteria hold: every `isRequired` lesson completed; if `minLiveAttendancePercent` is set, attendance across completed sessions of the student's batch ≥ threshold (unevaluable until at least one session is completed); if `requireAssessment`, every `assessment` lesson completed/passed.
2. When a progress or attendance write makes a student eligible, the backend sets `enrollment.completedAt`, marks the batch enrollment `completed`, and if `course.certificateEnabled && certificateIssuance === 'automatic'` issues a certificate. With `manual_approval` the student appears in the eligible list for an admin to issue.
3. Certificate numbers are unique (`KBA-<year>-<sequence>`). Revocation keeps the row with `status='revoked'`, `revokedAt`, `revokedReason`; verification reports `valid=false`.
4. Purchase ≠ enrollment ≠ completion ≠ certificate. Each is a separate record (`PaymentTransaction`, `CourseEnrollment`, `LessonProgress`/`AttendanceRecord`, `Certificate`).

## Recommended data model

User, Role/Permission, StudentProfile, Course, CourseModule, Lesson, Batch, BatchEnrollment, CourseEnrollment, LiveSession, AttendanceRecord, LessonProgress, PaymentTransaction, Certificate, CertificateVerification (log of verification lookups, optional), AuditLog, BatchHistoryEvent.

Constraints: unique (studentId, courseId) on CourseEnrollment; unique (studentId, lessonId) on LessonProgress; unique (sessionId, studentId) on AttendanceRecord; unique certificateNumber; unique orderId; webhook processing wrapped in a transaction with row-level lock on the payment.

## Security checklist for the backend

- Hash passwords with bcrypt/argon2; never return hashes or tokens.
- Enforce permissions on every route; ownership checks for `:self` routes.
- Sign and expire join URLs, stream URLs, invoice and certificate downloads.
- Verify gateway webhook signatures; store the raw payload for audit; process idempotently.
- Rate-limit auth endpoints; lock accounts after repeated failures if policy requires.
- Set security headers (CSP, HSTS), sanitise all inputs, and return generic error messages.
- Write an audit row for every admin mutation; never hard-delete batches, enrollments, payments or certificates through ordinary UI actions.
