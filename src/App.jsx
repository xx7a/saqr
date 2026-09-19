import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { I18nProvider } from '@/lib/i18n';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleGuard from '@/components/RoleGuard';
import PostLoginRedirect from '@/components/PostLoginRedirect';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NavigationProgress } from '@/components/AnimationSystem';
import HelpChat from '@/components/HelpChat';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Public pages
import Home from '@/pages/Home';
import Tracks from '@/pages/Tracks';
import About from '@/pages/About';
import FAQ from '@/pages/FAQ';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import VerifyCertificate from '@/pages/VerifyCertificate';

// Student pages
import StudentDashboard from '@/pages/StudentDashboard';
import MySubjects from '@/pages/MySubjects';
import SubjectDetail from '@/pages/SubjectDetail';
import LessonPage from '@/pages/LessonPage';
import TestPage from '@/pages/TestPage';
import Specializations from '@/pages/Specializations';
import CompassQuiz from '@/pages/CompassQuiz';
import Leaderboard from '@/pages/Leaderboard';
import SpecializationDetail from '@/pages/SpecializationDetail';
import Certificates from '@/pages/Certificates';
import Profile from '@/pages/Profile';
import Notifications from '@/pages/Notifications';
import Labs from '@/pages/Labs';
import LabPlayer from '@/components/labs/LabPlayer';
import RealLabs from '@/pages/RealLabs';
import RealLabPlayer from '@/pages/RealLabPlayer';
import Assignments from '@/pages/Assignments';
import Progress from '@/pages/Progress';
import SpecializationFinalExam from '@/pages/SpecializationFinalExam';

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard';
import AdminSettings from '@/pages/AdminSettings';
import AdminContent from '@/pages/AdminContent';
import AdminUsers from '@/pages/AdminUsers';
import AdminAnnouncements from '@/pages/AdminAnnouncements';
import AdminSubjectDetail from '@/pages/AdminSubjectDetail';
import AdminCurriculum from '@/pages/AdminCurriculum';
import AdminPoints from '@/pages/AdminPoints';
import AdminLeaderboard from '@/pages/AdminLeaderboard';
import AdminRealLabs from '@/pages/AdminRealLabs';
import AdminLabSettings from '@/pages/AdminLabSettings';
import AdminLabSessions from '@/pages/AdminLabSessions';
import AdminLabLogs from '@/pages/AdminLabLogs';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const isInstant = location.pathname === '/post-login';

  return (
    <>
      <NavigationProgress />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={prefersReducedMotion || isInstant ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion || isInstant ? false : { opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
    <Routes location={location}>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/post-login" element={<PostLoginRedirect />} />

      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/tracks" element={<Tracks />} />
      <Route path="/about" element={<About />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/verify/:code" element={<VerifyCertificate />} />
      <Route path="/leaderboard" element={<Leaderboard />} />

      {/* Protected student routes */}
      <Route element={<RoleGuard allowedRole="student" unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/my-subjects" element={<MySubjects />} />
        <Route path="/my-subjects/:trackId" element={<MySubjects />} />
        <Route path="/subject/:subjectId" element={<SubjectDetail />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/test/:testId" element={<TestPage />} />
        <Route path="/specializations" element={<Specializations />} />
        <Route path="/compass" element={<CompassQuiz />} />
        <Route path="/specialization/:specId" element={<SpecializationDetail />} />
        <Route path="/my-specialization" element={<SpecializationDetail />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/lab/:labId" element={<LabPlayer />} />
        <Route path="/real-labs" element={<RealLabs />} />
        <Route path="/real-lab/:labId" element={<RealLabPlayer />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/specialization/:specId/final-exam" element={<SpecializationFinalExam />} />
      </Route>

      {/* Protected admin routes */}
      <Route element={<RoleGuard allowedRole="admin" unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/tracks" element={<AdminContent type="tracks" />} />
        <Route path="/admin/curriculum" element={<AdminCurriculum />} />
        <Route path="/admin/subjects" element={<AdminContent type="subjects" />} />
        <Route path="/admin/subject/:subjectId" element={<AdminSubjectDetail />} />
        <Route path="/admin/lessons" element={<AdminContent type="lessons" />} />
        <Route path="/admin/activities" element={<AdminContent type="activities" />} />
        <Route path="/admin/labs" element={<AdminContent type="labs" />} />
        <Route path="/admin/tests" element={<AdminContent type="tests" />} />
        <Route path="/admin/assignments" element={<AdminContent type="assignments" />} />
        <Route path="/admin/specializations" element={<AdminContent type="specializations" />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/certificates" element={<AdminContent type="certificates" />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/logs" element={<AdminContent type="logs" />} />
        <Route path="/admin/points" element={<AdminPoints />} />
        <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
        <Route path="/admin/real-labs" element={<AdminRealLabs />} />
        <Route path="/admin/lab-settings" element={<AdminLabSettings />} />
        <Route path="/admin/lab-sessions" element={<AdminLabSessions />} />
        <Route path="/admin/lab-logs" element={<AdminLabLogs />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <ErrorBoundary>
              <AuthenticatedApp />
            </ErrorBoundary>
          </Router>
          <HelpChat />
          <Toaster />
          <SonnerToaster position="top-center" richColors closeButton />
        </QueryClientProvider>
      </I18nProvider>
    </AuthProvider>
  )
}

export default App