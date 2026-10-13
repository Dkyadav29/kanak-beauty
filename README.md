# Kanak Beauty Academy

A premium, responsive React application for a professional beauty training institute: public course catalogue, authentication, a student LMS (courses, live classes, recordings, progress, payments, certificates) and an academy administration console (students, courses, batches, batch history, enrollments, payments, certificates, audit logs) with strict role-based access control.

## Stack

React 19 · Vite · TypeScript (strict) · Tailwind CSS v4 · React Router 7 · TanStack Query 5 · Axios · React Hook Form + Zod · Recharts · Framer Motion · Lucide icons · Vitest + Testing Library.

## Getting started

```bash
npm install
cp .env.example .env      # points at the Django backend on http://localhost:8000
npm run dev               # http://localhost:5173
```

The app talks to the backend in `backend/` (Django REST Framework + MariaDB). Start it first:

```bash
cd backend
.venv\Scripts\activate            # Windows
python manage.py migrate
python manage.py create_admin --email admin@example.com --name "Kanak Admin" --password '...'
python manage.py seed_demo        # optional: demo courses, students and payments (DEBUG only)
python manage.py runserver        # http://localhost:8000, OpenAPI docs at /api/v1/docs
```

In development the backend prints outgoing emails (OTP codes, reset links) to its console and echoes the password-reset token in the API response, which the Forgot Password page turns into a link.

Other scripts:

```bash
npm run build             # type-check + production build (dist/)
npm run preview           # serve the production build
npm run lint              # TypeScript type-check only
npm test                  # Vitest (RBAC, enrollment, payment, certificate rules)
```

If `node_modules/.bin` is missing on your machine (seen with some npm versions on Windows), run the tools directly: `node node_modules/vite/bin/vite.js`, `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`, `node node_modules/vitest/vitest.mjs run`.

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base URL, e.g. `http://localhost:8000/api/v1`. The backend's `CORS_ALLOWED_ORIGINS` must include the frontend origin. |
| `VITE_PUBLIC_SITE_URL` | Public origin used to build certificate verification and referral links. Must match the backend's `PUBLIC_SITE_URL`. |
| `VITE_PAYMENT_SANDBOX` | `true` shows the sandbox checkout controls (choose success/failure). Must match the backend's `PAYMENT_GATEWAY=sandbox`; set `false` with a real gateway. |

## Demo accounts (after `python manage.py seed_demo`)

| Role | Email | Password |
| --- | --- | --- |
| Student (several enrollments, one certificate, a joinable live class) | `priya@student.demo` | `Student@123` |
| Student (different enrollments) | `ananya@student.demo` | `Student@123` |
| Admin | `admin@kanakacademy.demo` | `Admin@123` |

The seed is demo content only. Testimonials on the home and success-stories pages are hard-coded placeholders labelled "Demo" until approved quotes are supplied.

## Project structure

```
src/
  app/             providers (Query, Auth, Toast), router, root error boundary
  components/
    ui/            design-system primitives (Button, Card, Badge/StatusBadge, Form fields, Dialog,
                   ConfirmationDialog, DataTable, Pagination, SearchAndFilters, LoadingSkeleton,
                   EmptyState, ErrorState, Toast, Avatar, ProgressBar, Tabs, DashboardStatCard…)
    layout/        PublicNavbar, PublicFooter, PublicLayout, DashboardLayout (student/admin sidebars)
    auth/          ProtectedRoute, RequireRole, RequirePermission, PermissionGate, GuestOnly, AuthCard
    shared/        CourseCard, CourseProgressCard, LiveClassCard, CertificatePreview
  features/auth/   AuthProvider / useAuth (session bootstrap via GET /auth/me, expiry handling)
  hooks/           TanStack Query hooks per domain (useCatalog, useStudent, useAdmin) + queryKeys
  services/        typed API modules (auth, catalog, student, payment, admin) — the only place Axios is called
  lib/api/         Axios client (bearer auth, silent token refresh), token storage, error normalisation
  lib/             permissions table + helpers, formatting utilities
  pages/           public/, auth/, student/, admin/ route components (lazy-loaded)
  types/           domain models and API request/response types
backend/                Django REST Framework backend (see backend/README.md)
docs/API_CONTRACTS.md   HTTP contract shared by the frontend and backend
tests/                  Vitest suites (API client behaviour)
```

## Routes

| Area | Paths |
| --- | --- |
| Public | `/`, `/courses`, `/courses/:courseId`, `/live-classes`, `/about`, `/success-stories`, `/contact`, `/faq`, `/terms`, `/privacy`, `/refund-policy`, `/verify`, `/verify/:certificateNumber` |
| Auth | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Student | `/student/dashboard`, `/student/courses`, `/student/courses/:courseId/learn`, `/student/live-classes`, `/student/live-classes/:sessionId/room`, `/student/recordings`, `/student/profile`, `/student/payments`, `/student/certificates`, `/student/certificates/:certificateId`, `/student/checkout/:courseId`, `/student/refer` |
| Admin | `/admin/dashboard`, `/admin/students`, `/admin/students/:studentId`, `/admin/courses`, `/admin/courses/new`, `/admin/courses/:courseId`, `/admin/batches`, `/admin/batches/:batchId`, `/admin/batch-history`, `/admin/live-sessions`, `/admin/enrollments`, `/admin/payments`, `/admin/certificates`, `/admin/referrals`, `/admin/audit-logs` |

## Refer & Earn

Logged-in students get a personal referral code and link on **Refer & Earn** (`/student/refer`), with share buttons, stats, a referral list and a wallet ledger. A friend enters the code at registration (`/register?ref=CODE` pre-fills it) and receives a welcome discount on their first course. When that first payment is confirmed by the backend webhook, the referrer's wallet is credited; refunds reverse the reward. Wallet credit can be applied at checkout up to a per-order limit. Admins see activity, conversion and outstanding wallet liability on `/admin/referrals` and can change the programme amounts or pause it (audited). In the seeded demo data Priya has one rewarded referral and a wallet balance to try at checkout.

Unauthorised access renders a 403 page; anonymous access to protected routes redirects to `/login` and returns to the requested page after sign-in when it matches the user's role.

## Security model (frontend responsibilities)

- Only the opaque JWTs are stored (localStorage); user, role and permissions are re-fetched from `GET /auth/me` on every boot. An expired access token is refreshed once via `POST /auth/token/refresh` (the backend rotates and blacklists the old refresh token); if that fails the session is cleared. Logout revokes the refresh token server-side.
- Route guards (`ProtectedRoute`, `RequireRole`, `RequirePermission`) and `PermissionGate` shape navigation only; the backend enforces every permission and ownership rule on every request.
- Course access is granted only when the backend reports a payment as `paid` after a verified gateway webhook. The checkout success screen is driven by polling the payment record, never by client state.
- Join links, recording streams and downloads are requested from the backend at the moment of use; nothing is embedded in the client.
- Certificates are issued by the backend when configured completion criteria are met (or by an admin after server-side re-verification), carry unique numbers and verify against the backend; revoked certificates fail verification.
- Errors shown to users are normalised, user-safe messages. No stack traces.

See `docs/API_CONTRACTS.md` for the backend-side rules (signature verification, idempotency, transactions, rate limiting, audit).

## Testing

`npm test` runs:

- `tests/apiClient.test.ts` — the Axios client: bearer header, silent refresh on 401 with the request replayed, a single shared refresh for concurrent 401s, sign-out when the refresh is rejected, and login failures treated as credential errors rather than session expiry.

The business rules (RBAC, ownership, payments and entitlement, progress, certificates, batch history, audit) are tested in the backend suite: `cd backend && python -m pytest -q`.

Responsive behaviour is implemented with mobile-first Tailwind layouts (collapsible navbars, drawer sidebar, horizontally scrolling tables with `hideBelow` columns). Verify visually at phone, tablet and desktop widths in the browser dev tools.

## Going to production

1. Point `VITE_API_BASE_URL` and `VITE_PUBLIC_SITE_URL` at the deployed backend and site; set the same origins in the backend's `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` and `PUBLIC_SITE_URL`.
2. Replace the sandbox gateway: set the backend's `PAYMENT_GATEWAY` to the real provider, set `VITE_PAYMENT_SANDBOX=false`, and add the provider's hosted-checkout redirect or SDK to `CheckoutPage` where the sandbox buttons are today.
3. Configure a real email backend so OTP codes and reset links are delivered (the `devResetToken` echo is disabled automatically when `DEBUG` is off).
4. Wire the optional endpoints the UI is prepared for: contact form, invoice download, official certificate PDF, thumbnail upload.
