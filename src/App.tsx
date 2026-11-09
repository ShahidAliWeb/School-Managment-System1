import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Layout, MODULE_NAV_ITEMS, ModuleKey } from './components/Layout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { TeacherLmsPage } from './pages/TeacherLmsPage.tsx';
import { StudentsPage } from './pages/StudentsPage.tsx';
import { AttendancePage } from './pages/AttendancePage.tsx';
import { AcademicsPage } from './pages/AcademicsPage.tsx';
import { ExamsPage } from './pages/ExamsPage.tsx';
import { FeesPage } from './pages/FeesPage.tsx';
import { StaffPage } from './pages/StaffPage.tsx';
import { CommunicationPage } from './pages/CommunicationPage.tsx';
import { PortalPage } from './pages/PortalPage.tsx';
import { CampusOpsPage } from './pages/CampusOpsPage.tsx';
import { SecurityReportsPage } from './pages/SecurityReportsPage.tsx';
import { UserRole } from './types/index.ts';

function WorkspaceRouter() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');

  useEffect(() => {
    if (!user) return;
    const defaultMod: ModuleKey =
      user.role === UserRole.STUDENT
        ? 'portal'
        : user.role === UserRole.TEACHER
        ? 'teacher-lms'
        : 'dashboard';

    const permitted = MODULE_NAV_ITEMS.filter((m) => m.roles.includes(user.role)).map(
      (m) => m.key
    );

    if (!permitted.includes(activeModule)) {
      setActiveModule(defaultMod);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Enforce strict role guard at render time as well
  const permittedKeys = MODULE_NAV_ITEMS.filter((m) => m.roles.includes(user.role)).map(
    (m) => m.key
  );
  const safeModule: ModuleKey = permittedKeys.includes(activeModule)
    ? activeModule
    : user.role === UserRole.STUDENT
    ? 'portal'
    : user.role === UserRole.TEACHER
    ? 'teacher-lms'
    : 'dashboard';

  const renderModule = () => {
    switch (safeModule) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveModule} />;
      case 'teacher-lms':
        return <TeacherLmsPage />;
      case 'portal':
        return <PortalPage />;
      case 'students':
        return <StudentsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'academics':
        return <AcademicsPage />;
      case 'exams':
        return <ExamsPage />;
      case 'fees':
        return <FeesPage />;
      case 'staff':
        return <StaffPage />;
      case 'communication':
        return <CommunicationPage />;
      case 'operations':
        return <CampusOpsPage />;
      case 'security':
        return <SecurityReportsPage />;
      default:
        return <PortalPage />;
    }
  };

  return (
    <Layout activeModule={safeModule} onSelectModule={setActiveModule}>
      {renderModule()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceRouter />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
