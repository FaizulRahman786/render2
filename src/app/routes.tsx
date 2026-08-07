import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthCallback } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { TeacherLayout } from './components/layout/TeacherLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded portal pages - loaded on demand
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const StudentsPage = lazy(() => import('./pages/admin/StudentsPage').then(m => ({ default: m.StudentsPage })));
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage').then(m => ({ default: m.TeachersPage })));
const CoursesPage = lazy(() => import('./pages/admin/CoursesPage').then(m => ({ default: m.CoursesPage })));
const BatchesPage = lazy(() => import('./pages/admin/BatchesPage').then(m => ({ default: m.BatchesPage })));
const AdminMaterialsPage = lazy(() => import('./pages/admin/AdminMaterialsPage').then(m => ({ default: m.AdminMaterialsPage })));
const AdminTestsPage = lazy(() => import('./pages/admin/AdminTestsPage').then(m => ({ default: m.AdminTestsPage })));
const FeesPage = lazy(() => import('./pages/admin/FeesPage').then(m => ({ default: m.FeesPage })));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationBroadcastPage = lazy(() => import('./pages/admin/NotificationBroadcastPage').then(m => ({ default: m.NotificationBroadcastPage })));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const AdminLiveClassesPage = lazy(() => import('./pages/admin/AdminLiveClassesPage').then(m => ({ default: m.AdminLiveClassesPage })));
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage').then(m => ({ default: m.SystemHealthPage })));

const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const MyBatchesPage = lazy(() => import('./pages/teacher/MyBatchesPage').then(m => ({ default: m.MyBatchesPage })));
const TeacherMaterialsPage = lazy(() => import('./pages/teacher/TeacherMaterialsPage').then(m => ({ default: m.TeacherMaterialsPage })));
const LiveClassesPage = lazy(() => import('./pages/teacher/LiveClassesPage').then(m => ({ default: m.LiveClassesPage })));
const TeacherTestsPage = lazy(() => import('./pages/teacher/TeacherTestsPage').then(m => ({ default: m.TeacherTestsPage })));
const AssignmentsPage = lazy(() => import('./pages/teacher/AssignmentsPage').then(m => ({ default: m.AssignmentsPage })));
const DoubtsPage = lazy(() => import('./pages/teacher/DoubtsPage').then(m => ({ default: m.DoubtsPage })));
const AnalyticsPage = lazy(() => import('./pages/teacher/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const StudentProgressPage = lazy(() => import('./pages/teacher/StudentProgressPage').then(m => ({ default: m.StudentProgressPage })));
const AttendancePage = lazy(() => import('./pages/teacher/AttendancePage').then(m => ({ default: m.AttendancePage })));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage').then(m => ({ default: m.TeacherProfilePage })));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentCoursesPage = lazy(() => import('./pages/student/CoursesPage').then(m => ({ default: m.CoursesPage })));
const MaterialsPage = lazy(() => import('./pages/student/MaterialsPage').then(m => ({ default: m.MaterialsPage })));
const StudentLiveClassesPage = lazy(() => import('./pages/student/StudentLiveClassesPage').then(m => ({ default: m.StudentLiveClassesPage })));
const StudentTestsPage = lazy(() => import('./pages/student/StudentTestsPage').then(m => ({ default: m.StudentTestsPage })));
const StudentResultsPage = lazy(() => import('./pages/student/ResultsPage').then(m => ({ default: m.ResultsPage })));
const StudentAssignmentsPage = lazy(() => import('./pages/student/StudentAssignmentsPage').then(m => ({ default: m.StudentAssignmentsPage })));
const StudentDoubtsPage = lazy(() => import('./pages/student/StudentDoubtsPage').then(m => ({ default: m.StudentDoubtsPage })));
const StudentFeesPage = lazy(() => import('./pages/student/StudentFeesPage').then(m => ({ default: m.StudentFeesPage })));
const NotificationsPage = lazy(() => import('./pages/student/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage').then(m => ({ default: m.ProfilePage })));

// Public pages - keep eager for SEO
import { PublicLayout } from './pages/public/PublicLayout';
import { HomePage } from './pages/public/HomePage';
import { CoursesPage as PublicCoursesPage } from './pages/public/CoursesPage';
import { FacultyPage } from './pages/public/FacultyPage';
import { NoticesPage as PublicNoticesPage } from './pages/public/NoticesPage';
import { EventsPage as PublicEventsPage } from './pages/public/EventsPage';
import { ContactPage } from './pages/public/ContactPage';
import { AdmissionsPage } from './pages/public/AdmissionsPage';
import { FeesPage as PublicFeesPage } from './pages/public/FeesPage';
import { AchievementsPage } from './pages/public/AchievementsPage';
import { ResultsPage as PublicResultsPage } from './pages/public/ResultsPage';
import { GalleryPage } from './pages/public/GalleryPage';
import { ReviewsPage } from './pages/public/ReviewsPage';
import { BlogPage } from './pages/public/BlogPage';
import { BlogPostPage } from './pages/public/BlogPostPage';
import { FaqsPage } from './pages/public/FaqsPage';
import { StoryPage } from './pages/public/StoryPage';
import { EventDetailPage } from './pages/public/EventDetailPage';
import { CustomPageView, CustomSlugPage } from './pages/public/CustomPageView';
import { PreviewPage } from './pages/public/PreviewPage';

// Website CMS pages - lazy loaded
const WebsiteLayout = lazy(() => import('./pages/admin/website/WebsiteLayout').then(m => ({ default: m.WebsiteLayout })));
const WebsiteOverviewPage = lazy(() => import('./pages/admin/website/WebsiteOverviewPage').then(m => ({ default: m.WebsiteOverviewPage })));
const CmsEditorPage = lazy(() => import('./pages/admin/website/CmsEditorPage').then(m => ({ default: m.CmsEditorPage })));
const SitePreviewPage = lazy(() => import('./pages/admin/website/SitePreviewPage').then(m => ({ default: m.SitePreviewPage })));
const NoticesManagerPage = lazy(() => import('./pages/admin/website/NoticesManagerPage').then(m => ({ default: m.NoticesManagerPage })));
const EventsManagerPage = lazy(() => import('./pages/admin/website/EventsManagerPage').then(m => ({ default: m.EventsManagerPage })));
const EnquiriesPage = lazy(() => import('./pages/admin/website/EnquiriesPage').then(m => ({ default: m.EnquiriesPage })));
const MediaLibraryPage = lazy(() => import('./pages/admin/website/MediaLibraryPage').then(m => ({ default: m.MediaLibraryPage })));
const HomepageSectionsPage = lazy(() => import('./pages/admin/website/HomepageSectionsPage').then(m => ({ default: m.HomepageSectionsPage })));
const NavigationManagerPage = lazy(() => import('./pages/admin/website/NavigationManagerPage').then(m => ({ default: m.NavigationManagerPage })));
const SiteSettingsPage = lazy(() => import('./pages/admin/website/SiteSettingsPage').then(m => ({ default: m.SiteSettingsPage })));
const SitePagesPage = lazy(() => import('./pages/admin/website/SitePagesPage').then(m => ({ default: m.SitePagesPage })));
const CustomPagesPage = lazy(() => import('./pages/admin/website/CustomPagesPage').then(m => ({ default: m.CustomPagesPage })));
const CustomPageEditorPage = lazy(() => import('./pages/admin/website/CustomPageEditorPage').then(m => ({ default: m.CustomPageEditorPage })));
const AdmissionsManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.AdmissionsManagerPage })));
const FeeStructuresManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.FeeStructuresManagerPage })));
const AchievementsManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.AchievementsManagerPage })));
const ResultsManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.ResultsManagerPage })));
const GalleryManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.GalleryManagerPage })));
const BlogManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.BlogManagerPage })));
const FaqsManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.FaqsManagerPage })));
const ReviewsManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.ReviewsManagerPage })));
const FacultyManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.FacultyManagerPage })));
const CoursesManagerPage = lazy(() => import('./pages/admin/website/SiteCollectionsPage').then(m => ({ default: m.CoursesManagerPage })));

// Loading fallback for lazy routes
const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
  </ErrorBoundary>
);

const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-md rounded-xl bg-card p-8 text-center shadow-lg border">
      <h1 className="text-2xl font-semibold text-foreground">Unauthorized</h1>
      <p className="mt-2 text-sm text-muted-foreground">You do not have access to this area.</p>
      <Navigate to="/login" replace />
    </div>
  </div>
);

const AuthLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingSpinner />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <UnauthorizedPage />;
  return <>{children}</>;
};

const LoginRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingSpinner />;
  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
  }
  return <LoginPage />;
};

export const router = createBrowserRouter([
  // ── Public website (marketing site, indexable) ──
  { path: '/', element: <PublicLayout><HomePage /></PublicLayout> },
  { path: '/courses', element: <PublicLayout><PublicCoursesPage /></PublicLayout> },
  { path: '/faculty', element: <PublicLayout><FacultyPage /></PublicLayout> },
  { path: '/notices', element: <PublicLayout><PublicNoticesPage /></PublicLayout> },
  { path: '/events', element: <PublicLayout><PublicEventsPage /></PublicLayout> },
  { path: '/events/:slug', element: <PublicLayout><EventDetailPage /></PublicLayout> },
  { path: '/admissions', element: <PublicLayout><AdmissionsPage /></PublicLayout> },
  { path: '/fees', element: <PublicLayout><PublicFeesPage /></PublicLayout> },
  { path: '/achievements', element: <PublicLayout><AchievementsPage /></PublicLayout> },
  { path: '/results', element: <PublicLayout><PublicResultsPage /></PublicLayout> },
  { path: '/gallery', element: <PublicLayout><GalleryPage /></PublicLayout> },
  { path: '/reviews', element: <PublicLayout><ReviewsPage /></PublicLayout> },
  { path: '/blog', element: <PublicLayout><BlogPage /></PublicLayout> },
  { path: '/blog/:slug', element: <PublicLayout><BlogPostPage /></PublicLayout> },
  { path: '/faqs', element: <PublicLayout><FaqsPage /></PublicLayout> },
  { path: '/story', element: <PublicLayout><StoryPage /></PublicLayout> },
  { path: '/contact', element: <PublicLayout><ContactPage /></PublicLayout> },
  { path: '/:slug', element: <PublicLayout><CustomSlugPage /></PublicLayout> },
  { path: '/preview', element: <PreviewPage /> },
  { path: '/login', element: <LoginRoute /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><AdminDashboard /></SuspenseWrapper> },
      { path: 'students', element: <SuspenseWrapper><StudentsPage /></SuspenseWrapper> },
      { path: 'teachers', element: <SuspenseWrapper><TeachersPage /></SuspenseWrapper> },
      { path: 'courses', element: <SuspenseWrapper><CoursesPage /></SuspenseWrapper> },
      { path: 'batches', element: <SuspenseWrapper><BatchesPage /></SuspenseWrapper> },
      { path: 'materials', element: <SuspenseWrapper><AdminMaterialsPage /></SuspenseWrapper> },
      { path: 'tests', element: <SuspenseWrapper><AdminTestsPage /></SuspenseWrapper> },
      { path: 'fees', element: <SuspenseWrapper><FeesPage /></SuspenseWrapper> },
      { path: 'broadcast', element: <SuspenseWrapper><NotificationBroadcastPage /></SuspenseWrapper> },
      { path: 'live-classes', element: <SuspenseWrapper><AdminLiveClassesPage /></SuspenseWrapper> },
      { path: 'audit-logs', element: <SuspenseWrapper><AuditLogsPage /></SuspenseWrapper> },
      { path: 'settings', element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper> },
      { path: 'system', element: <SuspenseWrapper><SystemHealthPage /></SuspenseWrapper> },
      // Aliases kept for URL compatibility with the documented site map
      { path: 'site-preview', element: <SuspenseWrapper><SitePreviewPage /></SuspenseWrapper> },
      { path: 'media', element: <SuspenseWrapper><MediaLibraryPage /></SuspenseWrapper> },
      {
        path: 'website',
        element: <SuspenseWrapper><WebsiteLayout /></SuspenseWrapper>,
        children: [
          { index: true, element: <SuspenseWrapper><WebsiteOverviewPage /></SuspenseWrapper> },
          { path: 'content', element: <SuspenseWrapper><CmsEditorPage /></SuspenseWrapper> },
          { path: 'homepage', element: <SuspenseWrapper><HomepageSectionsPage /></SuspenseWrapper> },
          { path: 'admissions', element: <SuspenseWrapper><AdmissionsManagerPage /></SuspenseWrapper> },
          { path: 'fees', element: <SuspenseWrapper><FeeStructuresManagerPage /></SuspenseWrapper> },
          { path: 'achievements', element: <SuspenseWrapper><AchievementsManagerPage /></SuspenseWrapper> },
          { path: 'results', element: <SuspenseWrapper><ResultsManagerPage /></SuspenseWrapper> },
          { path: 'gallery', element: <SuspenseWrapper><GalleryManagerPage /></SuspenseWrapper> },
          { path: 'reviews', element: <SuspenseWrapper><ReviewsManagerPage /></SuspenseWrapper> },
          { path: 'blog', element: <SuspenseWrapper><BlogManagerPage /></SuspenseWrapper> },
          { path: 'faqs', element: <SuspenseWrapper><FaqsManagerPage /></SuspenseWrapper> },
          { path: 'faculty', element: <SuspenseWrapper><FacultyManagerPage /></SuspenseWrapper> },
          { path: 'courses', element: <SuspenseWrapper><CoursesManagerPage /></SuspenseWrapper> },
          { path: 'pages', element: <SuspenseWrapper><SitePagesPage /></SuspenseWrapper> },
          { path: 'navigation', element: <SuspenseWrapper><NavigationManagerPage /></SuspenseWrapper> },
          { path: 'custom-pages', element: <SuspenseWrapper><CustomPagesPage /></SuspenseWrapper> },
          { path: 'custom-pages/:id', element: <SuspenseWrapper><CustomPageEditorPage /></SuspenseWrapper> },
          { path: 'preview', element: <SuspenseWrapper><SitePreviewPage /></SuspenseWrapper> },
          { path: 'notices', element: <SuspenseWrapper><NoticesManagerPage /></SuspenseWrapper> },
          { path: 'events', element: <SuspenseWrapper><EventsManagerPage /></SuspenseWrapper> },
          { path: 'enquiries', element: <SuspenseWrapper><EnquiriesPage /></SuspenseWrapper> },
          { path: 'site-settings', element: <SuspenseWrapper><SiteSettingsPage /></SuspenseWrapper> },
          { path: 'media', element: <SuspenseWrapper><MediaLibraryPage /></SuspenseWrapper> },
        ],
      },
    ],
  },
  {
    path: '/teacher',
    element: (
      <ProtectedRoute allowedRoles={['teacher']}>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><TeacherDashboard /></SuspenseWrapper> },
      { path: 'batches', element: <SuspenseWrapper><MyBatchesPage /></SuspenseWrapper> },
      { path: 'materials', element: <SuspenseWrapper><TeacherMaterialsPage /></SuspenseWrapper> },
      { path: 'classes', element: <SuspenseWrapper><LiveClassesPage /></SuspenseWrapper> },
      { path: 'tests', element: <SuspenseWrapper><TeacherTestsPage /></SuspenseWrapper> },
      { path: 'assignments', element: <SuspenseWrapper><AssignmentsPage /></SuspenseWrapper> },
      { path: 'doubts', element: <SuspenseWrapper><DoubtsPage /></SuspenseWrapper> },
      { path: 'analytics', element: <SuspenseWrapper><AnalyticsPage /></SuspenseWrapper> },
      { path: 'progress', element: <SuspenseWrapper><StudentProgressPage /></SuspenseWrapper> },
      { path: 'attendance', element: <SuspenseWrapper><AttendancePage /></SuspenseWrapper> },
      { path: 'profile', element: <SuspenseWrapper><TeacherProfilePage /></SuspenseWrapper> },
    ],
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><StudentDashboard /></SuspenseWrapper> },
      { path: 'courses', element: <SuspenseWrapper><StudentCoursesPage /></SuspenseWrapper> },
      { path: 'materials', element: <SuspenseWrapper><MaterialsPage /></SuspenseWrapper> },
      { path: 'classes', element: <SuspenseWrapper><StudentLiveClassesPage /></SuspenseWrapper> },
      { path: 'tests', element: <SuspenseWrapper><StudentTestsPage /></SuspenseWrapper> },
      { path: 'results', element: <SuspenseWrapper><StudentResultsPage /></SuspenseWrapper> },
      { path: 'assignments', element: <SuspenseWrapper><StudentAssignmentsPage /></SuspenseWrapper> },
      { path: 'doubts', element: <SuspenseWrapper><StudentDoubtsPage /></SuspenseWrapper> },
      { path: 'fees', element: <SuspenseWrapper><StudentFeesPage /></SuspenseWrapper> },
      { path: 'notifications', element: <SuspenseWrapper><NotificationsPage /></SuspenseWrapper> },
      { path: 'profile', element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
