import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BookOpen,
  Award,
  Receipt,
  Briefcase,
  MessageSquare,
  GraduationCap,
  Building2,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ClipboardList,
} from 'lucide-react';
import { UserRole } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { formatRoleLabel } from '../lib/api.ts';
import { AcademicCrestSvg, SchoolLogoBanner } from './ui/PrintPreviewModal.tsx';

export type ModuleKey =
  | 'dashboard'
  | 'teacher-lms'
  | 'portal'
  | 'students'
  | 'attendance'
  | 'academics'
  | 'exams'
  | 'fees'
  | 'staff'
  | 'communication'
  | 'operations'
  | 'security';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

export const MODULE_NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Super Admin Overview',
    icon: LayoutDashboard,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    key: 'teacher-lms',
    label: 'LMS Portal & Results',
    icon: ClipboardList,
    roles: [UserRole.SUPER_ADMIN, UserRole.TEACHER],
  },
  {
    key: 'portal',
    label: 'Student LMS Portal',
    icon: GraduationCap,
    roles: [UserRole.STUDENT, UserRole.SUPER_ADMIN],
  },
  {
    key: 'students',
    label: 'Student Management',
    icon: Users,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    key: 'attendance',
    label: 'Attendance Register',
    icon: CalendarCheck,
    roles: [UserRole.SUPER_ADMIN, UserRole.TEACHER],
  },
  {
    key: 'exams',
    label: 'Exams & Report Cards',
    icon: Award,
    roles: [UserRole.SUPER_ADMIN, UserRole.TEACHER],
  },
  {
    key: 'academics',
    label: 'Timetable & Syllabus',
    icon: BookOpen,
    roles: [UserRole.SUPER_ADMIN, UserRole.TEACHER],
  },
  {
    key: 'fees',
    label: 'Fee Management',
    icon: Receipt,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    key: 'staff',
    label: 'Staff & Payroll',
    icon: Briefcase,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    key: 'communication',
    label: 'Notices & Alerts',
    icon: MessageSquare,
    roles: [UserRole.SUPER_ADMIN, UserRole.TEACHER],
  },
  {
    key: 'operations',
    label: 'Campus Operations',
    icon: Building2,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    key: 'security',
    label: 'RBAC & Security',
    icon: ShieldCheck,
    roles: [UserRole.SUPER_ADMIN],
  },
];

interface LayoutProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  children: React.ReactNode;
}

export function Layout({ activeModule, onSelectModule, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = MODULE_NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const currentNavLabel =
    visibleNav.find((n) => n.key === activeModule)?.label || 'Workspace';

  const handleNavClick = (key: ModuleKey) => {
    onSelectModule(key);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-3.5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <SchoolLogoBanner className="w-full h-auto rounded-lg border border-slate-200/80 dark:border-slate-800" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Module Navigation">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeModule;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {formatRoleLabel(user.role)}
                  {user.loginId ? ` · ${user.loginId}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
            <div className="px-3.5 py-3 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
              <SchoolLogoBanner className="h-12 w-auto rounded-md border border-slate-200/80 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeModule;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavClick(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb trail left, clean actions right */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <AcademicCrestSvg className="w-7 h-7 lg:hidden shrink-0" />
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Academic Session 2026–27
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
