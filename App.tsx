import React, { useEffect } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate } = ReactRouterDom;
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingIndicator from './components/LoadingIndicator';
import { useBranding } from './hooks/useBranding';

// New Imports for Public Pages
import PublicLayout from './components/PublicLayout';
import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import BatchesPage from './pages/student/ExploreCourses';

// Student Layout
import StudentLayout from './components/StudentLayout';

// Existing Page Imports
import LoginPage from './pages/LoginPage';
import StudyPage from './pages/student/StudentDashboard';
import CourseDetail from './pages/student/CourseDetail';
import WatchPage from './pages/student/WatchPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseManagement from './pages/admin/CourseManagement';
import StudentManagement from './pages/admin/StudentManagement';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import CourseEdit from './pages/admin/CourseEdit';
import PDFViewerPage from './pages/student/PDFViewerPage';
import SubjectEditPage from './pages/admin/SubjectEditPage';
import ChapterEditPage from './pages/admin/ChapterEditPage';

// New Page for Subject Chapters
import SubjectPage from './pages/student/SubjectPage';

// New Admin Page Imports
import AdminPayments from './pages/admin/AdminPayments';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminSupport from './pages/admin/AdminSupport';
import AdminSettings from './pages/admin/AdminSettings';
import SupportPage from './pages/student/SupportPage';
import AITestGeneratorPage from './pages/student/AITestGeneratorPage';
import LeaderboardPage from './pages/student/LeaderboardPage';
import InfoAIPage from './pages/InfoAIPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
};

const MainRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const { appName, logoUrl } = useBranding();
  
  const isStudent = user && user.role === 'student';
  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    if (appName) document.title = appName;
    if (logoUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = logoUrl;
    }
  }, [appName, logoUrl]);

  if (loading) {
    return <LoadingIndicator fullscreen />;
  }

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/login" element={!user ? <PublicLayout><LoginPage /></PublicLayout> : <Navigate to={isAdmin ? '/admin' : '/study'} />} />
        <Route path="/signup" element={!user ? <PublicLayout><SignupPage /></PublicLayout> : <Navigate to="/study" />} />
        <Route path="/infoai" element={<InfoAIPage />} />
        
        {/* Student Routes with Layout */}
        <Route path="/study" element={isStudent ? <StudentLayout><StudyPage /></StudentLayout> : <Navigate to="/login" />} />
        <Route path="/batches" element={isStudent ? <StudentLayout><BatchesPage /></StudentLayout> : <Navigate to="/login" />} />
        <Route path="/leaderboard" element={isStudent ? <StudentLayout><LeaderboardPage /></StudentLayout> : <Navigate to="/login" />} />
        <Route path="/course/:courseId" element={isStudent ? <StudentLayout><CourseDetail /></StudentLayout> : <Navigate to="/login" />} />
        <Route path="/course/:courseId/subject/:subjectId" element={isStudent ? <StudentLayout><SubjectPage /></StudentLayout> : <Navigate to="/login" />} />
        <Route path="/support" element={isStudent ? <StudentLayout><SupportPage /></StudentLayout> : <Navigate to="/login" />} />
        
        {/* Fullscreen Student Routes */}
        <Route path="/ai-test-generator" element={isStudent ? <AITestGeneratorPage /> : <Navigate to="/login" />} />
        <Route path="/course/:courseId/subject/:subjectId/chapter/:chapterId/video/:lectureId" element={isStudent ? <WatchPage /> : <Navigate to="/login" />} />
        <Route path="/course/:courseId/subject/:subjectId/chapter/:chapterId/pdf/:materialId" element={isStudent ? <PDFViewerPage /> : <Navigate to="/login" />} />
        
        {/* Redirects for old student routes */}
        <Route path="/dashboard" element={<Navigate to="/study" />} />
        <Route path="/explore" element={<Navigate to="/batches" />} />


        {/* Admin Routes */}
        {/* These routes are outside the AdminLayout for a focused, full-screen editing experience */}
        <Route path="/admin/courses/:courseId/subjects/:subjectId" element={isAdmin ? <SubjectEditPage /> : <Navigate to="/login" />} />
        <Route path="/admin/courses/:courseId/subjects/:subjectId/chapters/:chapterId" element={isAdmin ? <ChapterEditPage /> : <Navigate to="/login" />} />
        
        <Route path="/admin/*" element={isAdmin ? (
          <AdminLayout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="courses" element={<CourseManagement />} />
              <Route path="courses/new" element={<CourseEdit />} />
              <Route path="courses/:courseId" element={<CourseEdit />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="/" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminLayout>
        ) : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;