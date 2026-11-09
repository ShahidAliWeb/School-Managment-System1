import React, { useState } from 'react';
import { Lock, User, ArrowRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { AcademicCrestSvg, SchoolLogoBanner } from '../components/ui/PrintPreviewModal.tsx';

type PortalMode = 'STUDENT' | 'TEACHER' | 'SUPER_ADMIN';

interface DemoAccount {
  mode: PortalMode;
  roleLabel: string;
  name: string;
  identifier: string;
  password: string;
  scope: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    mode: 'SUPER_ADMIN',
    roleLabel: 'Super Admin (Single Controller)',
    name: 'Shahid Ali',
    identifier: 'csd241043@dsu.edu.pk',
    password: 'Admin@123',
    scope: 'Full LMS & ERP control · Students, Staff, Quizzes, Fees & Security',
  },
  {
    mode: 'TEACHER',
    roleLabel: 'Teacher Portal',
    name: 'Majid Ali',
    identifier: 'EMP-1002',
    password: 'Teacher@123',
    scope: 'Check quiz/exam results, grade assignments & update attendance',
  },
  {
    mode: 'TEACHER',
    roleLabel: 'Teacher Portal',
    name: 'Ashraf Panhwar',
    identifier: 'EMP-1004',
    password: 'Teacher@123',
    scope: 'Publish CS lectures/quizzes, check results & mark attendance',
  },
  {
    mode: 'STUDENT',
    roleLabel: 'Student Portal (Class 10th)',
    name: 'Kamran Ali',
    identifier: '10-2026-001',
    password: 'Student@123',
    scope: 'Student ID login · Limited to Quizzes, Assignments, Lectures & Attendance',
  },
  {
    mode: 'STUDENT',
    roleLabel: 'Student Portal (Class 10th)',
    name: 'Shahmer Ali',
    identifier: '10-2026-002',
    password: 'Student@123',
    scope: 'Student ID login · Limited to Quizzes, Assignments, Lectures & Attendance',
  },
  {
    mode: 'STUDENT',
    roleLabel: 'Student Portal (Class 9th)',
    name: 'Fahad Ali',
    identifier: '10-2026-004',
    password: 'Student@123',
    scope: 'Student ID login · Limited to Quizzes, Assignments, Lectures & Attendance',
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notify } = useToast();

  const [portalMode, setPortalMode] = useState<PortalMode>('STUDENT');
  const [identifier, setIdentifier] = useState('10-2026-001');
  const [password, setPassword] = useState('Student@123');
  const [submitting, setSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const selectPortalMode = (mode: PortalMode) => {
    setPortalMode(mode);
    if (mode === 'STUDENT') {
      setIdentifier('10-2026-001');
      setPassword('Student@123');
    } else if (mode === 'TEACHER') {
      setIdentifier('EMP-1002');
      setPassword('Teacher@123');
    } else {
      setIdentifier('csd241043@dsu.edu.pk');
      setPassword('Admin@123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(identifier, password);
      notify('Signed in to LMS Portal.', 'success');
    } catch (err: any) {
      notify(err.message || 'Invalid Student ID / Email or password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (acct: DemoAccount) => {
    setPortalMode(acct.mode);
    setIdentifier(acct.identifier);
    setPassword(acct.password);
    setSubmitting(true);
    try {
      await login(acct.identifier, acct.password);
      notify(`Signed in as ${acct.roleLabel} (${acct.name}).`, 'success');
    } catch (err: any) {
      notify(err.message || 'Quick login failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputLabel =
    portalMode === 'STUDENT'
      ? 'Student ID / Roll Number'
      : portalMode === 'TEACHER'
      ? 'Teacher Employee ID or Email'
      : 'Super Admin Email';

  const inputPlaceholder =
    portalMode === 'STUDENT'
      ? '10-2026-001'
      : portalMode === 'TEACHER'
      ? 'EMP-1002 or majid.ali@gbpskl.edu.pk'
      : 'csd241043@dsu.edu.pk';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-8 px-6 sm:px-10 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 shrink-0">
          <AcademicCrestSvg className="w-9 h-9 shrink-0" />
          <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap">
            GBPS: Kando Lund
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <span className="whitespace-nowrap">Student LMS Portal</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Teacher Gradebook & Attendance</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Super Admin Control</span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
      </header>

      {/* Main Split-Column Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 max-w-2xl mx-auto w-full">
          <div className="mb-6">
            <SchoolLogoBanner className="h-20 sm:h-24 w-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-5" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
              Learning Management System (LMS) · Academic Session 2026–2027
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              GBPS: Kando Lund LMS Portal Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Students sign in with their Student ID (Roll No) for Quizzes, Assignments, Lectures, and Attendance. Teachers manage results and attendance, and one Super Admin controls the entire system.
            </p>
          </div>

          {/* 3-Role Portal Mode Switcher */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-5 w-fit max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => selectPortalMode('STUDENT')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                portalMode === 'STUDENT'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Student Portal (ID Login)
            </button>
            <button
              type="button"
              onClick={() => selectPortalMode('TEACHER')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                portalMode === 'TEACHER'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Teacher Portal
            </button>
            <button
              type="button"
              onClick={() => selectPortalMode('SUPER_ADMIN')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                portalMode === 'SUPER_ADMIN'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Super Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {inputLabel}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={inputPlaceholder}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <span>
                {submitting
                  ? 'Authenticating...'
                  : portalMode === 'STUDENT'
                  ? 'Sign In with Student ID'
                  : portalMode === 'TEACHER'
                  ? 'Sign In to Teacher Portal'
                  : 'Sign In as Super Admin'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 3-Role LMS Quick Demo Switcher */}
          <div className="mt-9 pt-7 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                LMS Role Accounts (1 Super Admin · Teachers · Student ID Logins)
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click any account to sign in
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.identifier}
                  type="button"
                  disabled={submitting}
                  onClick={() => quickLogin(acct)}
                  className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {acct.roleLabel}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      {acct.password}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                    {acct.name} · <span className="font-mono text-blue-700 dark:text-blue-400">{acct.identifier}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 truncate">
                    {acct.scope}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Architectural Campus Media Panel */}
        <div className="hidden lg:block lg:col-span-5 relative overflow-hidden bg-slate-900 border-l border-slate-200 dark:border-slate-800">
          {!imgFailed ? (
            <img
              src="/src/assets/images/school_campus_architecture_1792853957758.jpg"
              alt="GBPS: Kando Lund Campus Courtyard"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent flex flex-col justify-end p-10 text-white">
            <p className="text-xs text-slate-300 mb-2">
              GBPS: Kando Lund · Unified LMS & Campus System
            </p>
            <h2 className="font-display text-2xl font-semibold leading-snug [text-wrap:balance]">
              Interactive online quizzes, lectures, assignments, and live attendance under strict role-based control.
            </h2>
            <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-3 gap-4 tabular-nums">
              <div>
                <div className="text-lg font-mono font-semibold">1 Admin</div>
                <div className="text-xs text-slate-300">Full LMS Control</div>
              </div>
              <div>
                <div className="text-lg font-mono font-semibold">Teacher</div>
                <div className="text-xs text-slate-300">Results & Attendance</div>
              </div>
              <div>
                <div className="text-lg font-mono font-semibold">Student ID</div>
                <div className="text-xs text-slate-300">Limited Portal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
