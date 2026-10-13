import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GuestOnly, ProtectedRoute, RequirePermission, RequireRole } from '@/components/auth/guards';
import { NotFoundPage } from '@/pages/ErrorPages';
import { RootErrorBoundary } from './RootErrorBoundary';

// Public
const HomePage = lazy(() => import('@/pages/public/HomePage'));
const CoursesPage = lazy(() => import('@/pages/public/CoursesPage'));
const CourseDetailsPage = lazy(() => import('@/pages/public/CourseDetailsPage'));
const LiveClassesPublicPage = lazy(() => import('@/pages/public/LiveClassesPublicPage'));
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const SuccessStoriesPage = lazy(() => import('@/pages/public/SuccessStoriesPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));
const FaqPage = lazy(() => import('@/pages/public/PolicyPages').then((m) => ({ default: m.FaqPage })));
const TermsPage = lazy(() => import('@/pages/public/PolicyPages').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/public/PolicyPages').then((m) => ({ default: m.PrivacyPage })));
const RefundPolicyPage = lazy(() => import('@/pages/public/PolicyPages').then((m) => ({ default: m.RefundPolicyPage })));
const VerifyCertificatePage = lazy(() => import('@/pages/public/VerifyCertificatePage'));

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));

// Student
const StudentDashboardPage = lazy(() => import('@/pages/student/StudentDashboardPage'));
const MyCoursesPage = lazy(() => import('@/pages/student/MyCoursesPage'));
const StudentLiveClassesPage = lazy(() => import('@/pages/student/StudentLiveClassesPage'));
const LiveRoomPage = lazy(() => import('@/pages/student/LiveRoomPage'));
const RecordingsPage = lazy(() => import('@/pages/student/RecordingsPage'));
const CourseLearningPage = lazy(() => import('@/pages/student/CourseLearningPage'));
const StudentProfilePage = lazy(() => import('@/pages/student/StudentProfilePage'));
const PaymentHistoryPage = lazy(() => import('@/pages/student/PaymentHistoryPage'));
const MyCertificatesPage = lazy(() => import('@/pages/student/MyCertificatesPage'));
const CertificateViewPage = lazy(() => import('@/pages/student/CertificateViewPage'));
const CheckoutPage = lazy(() => import('@/pages/student/CheckoutPage'));
const ReferEarnPage = lazy(() => import('@/pages/student/ReferEarnPage'));

// Admin
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminStudentsPage = lazy(() => import('@/pages/admin/AdminStudentsPage'));
const AdminStudentDetailPage = lazy(() => import('@/pages/admin/AdminStudentDetailPage'));
const AdminCoursesPage = lazy(() => import('@/pages/admin/AdminCoursesPage'));
const AdminCourseEditorPage = lazy(() => import('@/pages/admin/AdminCourseEditorPage'));
const AdminBatchesPage = lazy(() => import('@/pages/admin/AdminBatchesPage'));
const AdminBatchDetailPage = lazy(() => import('@/pages/admin/AdminBatchDetailPage'));
const AdminBatchHistoryPage = lazy(() => import('@/pages/admin/AdminBatchHistoryPage'));
const AdminLiveSessionsPage = lazy(() => import('@/pages/admin/AdminLiveSessionsPage'));
const AdminEnrollmentsPage = lazy(() => import('@/pages/admin/AdminEnrollmentsPage'));
const AdminPaymentsPage = lazy(() => import('@/pages/admin/AdminPaymentsPage'));
const AdminCertificatesPage = lazy(() => import('@/pages/admin/AdminCertificatesPage'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'));
const AdminReferralsPage = lazy(() => import('@/pages/admin/AdminReferralsPage'));

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/courses', element: <CoursesPage /> },
      { path: '/courses/:courseId', element: <CourseDetailsPage /> },
      { path: '/live-classes', element: <LiveClassesPublicPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/success-stories', element: <SuccessStoriesPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/refund-policy', element: <RefundPolicyPage /> },
      { path: '/verify', element: <VerifyCertificatePage /> },
      { path: '/verify/:certificateNumber', element: <VerifyCertificatePage /> },
      {
        path: '/login',
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        path: '/register',
        element: (
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        ),
      },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute>
        <RequireRole role="student">
          <DashboardLayout variant="student" />
        </RequireRole>
      </ProtectedRoute>
    ),
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/student/dashboard" replace /> },
      { path: 'dashboard', element: <StudentDashboardPage /> },
      { path: 'courses', element: <RequirePermission permission="courses:read:enrolled"><MyCoursesPage /></RequirePermission> },
      { path: 'courses/:courseId/learn', element: <RequirePermission permission="courses:read:enrolled"><CourseLearningPage /></RequirePermission> },
      { path: 'live-classes', element: <RequirePermission permission="live:join"><StudentLiveClassesPage /></RequirePermission> },
      { path: 'live-classes/:sessionId/room', element: <RequirePermission permission="live:join"><LiveRoomPage /></RequirePermission> },
      { path: 'recordings', element: <RequirePermission permission="recordings:watch"><RecordingsPage /></RequirePermission> },
      { path: 'profile', element: <RequirePermission permission="profile:read:self"><StudentProfilePage /></RequirePermission> },
      { path: 'payments', element: <RequirePermission permission="payments:read:self"><PaymentHistoryPage /></RequirePermission> },
      { path: 'certificates', element: <RequirePermission permission="certificates:read:self"><MyCertificatesPage /></RequirePermission> },
      { path: 'certificates/:certificateId', element: <RequirePermission permission="certificates:read:self"><CertificateViewPage /></RequirePermission> },
      { path: 'checkout/:courseId', element: <CheckoutPage /> },
      { path: 'refer', element: <RequirePermission permission="referrals:read:self"><ReferEarnPage /></RequirePermission> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RequireRole role="admin">
          <DashboardLayout variant="admin" />
        </RequireRole>
      </ProtectedRoute>
    ),
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <RequirePermission permission="analytics:read"><AdminDashboardPage /></RequirePermission> },
      { path: 'students', element: <RequirePermission permission="students:read"><AdminStudentsPage /></RequirePermission> },
      { path: 'students/:studentId', element: <RequirePermission permission="students:read"><AdminStudentDetailPage /></RequirePermission> },
      { path: 'courses', element: <RequirePermission permission="courses:manage"><AdminCoursesPage /></RequirePermission> },
      { path: 'courses/new', element: <RequirePermission permission="courses:manage"><AdminCourseEditorPage /></RequirePermission> },
      { path: 'courses/:courseId', element: <RequirePermission permission="courses:manage"><AdminCourseEditorPage /></RequirePermission> },
      { path: 'batches', element: <RequirePermission permission="batches:manage"><AdminBatchesPage /></RequirePermission> },
      { path: 'batches/:batchId', element: <RequirePermission permission="batches:manage"><AdminBatchDetailPage /></RequirePermission> },
      { path: 'batch-history', element: <RequirePermission permission="batches:manage"><AdminBatchHistoryPage /></RequirePermission> },
      { path: 'live-sessions', element: <RequirePermission permission="batches:manage"><AdminLiveSessionsPage /></RequirePermission> },
      { path: 'enrollments', element: <RequirePermission permission="enrollments:read"><AdminEnrollmentsPage /></RequirePermission> },
      { path: 'payments', element: <RequirePermission permission="payments:read"><AdminPaymentsPage /></RequirePermission> },
      { path: 'certificates', element: <RequirePermission permission="certificates:manage"><AdminCertificatesPage /></RequirePermission> },
      { path: 'audit-logs', element: <RequirePermission permission="audit:read"><AdminAuditLogsPage /></RequirePermission> },
      { path: 'referrals', element: <RequirePermission permission="referrals:manage"><AdminReferralsPage /></RequirePermission> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
