import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Download,
} from 'lucide-react';
import { apiRequest, exportToExcelCsv, formatPKR } from '../lib/api.ts';
import { ModuleKey } from '../components/Layout.tsx';
import { ActivityLog, Notice, PtmSchedule, UserRole } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardData {
  kpis: {
    totalStudents: number;
    totalStaff: number;
    attendanceRate: number;
    feeCollected: number;
    feePending: number;
    defaultersCount: number;
    pendingLeaves: number;
    lowStockItems: number;
    totalLectures?: number;
    totalQuizzes?: number;
    totalAssignments?: number;
    quizAttemptsCount?: number;
    assignmentSubmissionsCount?: number;
  };
  attendanceTrend: { month: string; rate: number }[];
  feeByClass: { className: string; collected: number; pending: number }[];
  enrollmentByClass: { className: string; enrolled: number; capacity: number }[];
  notices: Notice[];
  upcomingPtm: PtmSchedule[];
  recentLogs: ActivityLog[];
}

export function DashboardPage({
  onNavigate,
}: {
  onNavigate: (module: ModuleKey) => void;
}) {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest<DashboardData>('/dashboard/summary')
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
        Unable to load dashboard summary: {error}
      </div>
    );
  }

  const maxFeeTotal = Math.max(
    1,
    ...data.feeByClass.map((c) => c.collected + c.pending)
  );

  const handleExportSummary = () => {
    exportToExcelCsv(
      'gbps_kando_lund_executive_summary.csv',
      ['Class', 'Fee Collected (PKR)', 'Fee Pending (PKR)', 'Enrolled Students'],
      data.feeByClass.map((f, i) => [
        f.className,
        f.collected,
        f.pending,
        data.enrollmentByClass[i]?.enrolled ?? 0,
      ])
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Institutional Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Welcome back, {user?.name}. Live operational metrics across enrollment, attendance, and fee collection.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportSummary}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export Summary (Excel CSV)
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Active Enrollment</span>
            {hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER) && (
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 hover:underline"
              >
                Directory <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 dark:text-white">
            {data.kpis.totalStudents}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {data.kpis.totalStaff} active faculty & staff
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Student Attendance Rate</span>
            {hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER) && (
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 hover:underline"
              >
                Mark Daily <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            {data.kpis.attendanceRate}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Auto SMS alerts active on absences
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Fee Collected (Term)</span>
            {hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT) && (
              <button
                type="button"
                onClick={() => onNavigate('fees')}
                className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 hover:underline"
              >
                Vouchers <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 dark:text-white">
            {formatPKR(data.kpis.feeCollected)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pending: <span className="font-mono text-amber-700 dark:text-amber-400">{formatPKR(data.kpis.feePending)}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>LMS Courseware & Quizzes</span>
            <button
              type="button"
              onClick={() => onNavigate('teacher-lms')}
              className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 hover:underline"
            >
              Manage LMS <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 dark:text-white">
            {data.kpis.totalQuizzes ?? 0} Quizzes · {data.kpis.totalLectures ?? 0} Lectures
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {data.kpis.quizAttemptsCount ?? 0} quiz attempts · {data.kpis.assignmentSubmissionsCount ?? 0} assignments submitted
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Attendance Trend SVG Chart */}
        <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Monthly Attendance Rate
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Campus-wide present & late attendance percentage
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              Target ≥ 92.0%
            </span>
          </div>

          <div className="h-52 flex items-end justify-between gap-4 pt-6 px-2 border-b border-slate-200 dark:border-slate-800 tabular-nums">
            {data.attendanceTrend.map((pt) => {
              const barHeight = Math.max(20, Math.round(((pt.rate - 80) / 20) * 140));
              return (
                <div key={pt.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    {pt.rate}%
                  </span>
                  <div
                    className="w-full max-w-[44px] bg-blue-600 dark:bg-blue-500 rounded-t-md transition-opacity hover:opacity-90"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-4 pt-2.5 px-2 text-xs text-slate-500 dark:text-slate-400">
            {data.attendanceTrend.map((pt) => (
              <div key={pt.month} className="flex-1 text-center font-medium">
                {pt.month}
              </div>
            ))}
          </div>
        </div>

        {/* Fee Collected vs Pending by Class */}
        <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Fee Collected vs Pending by Class
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                October 2026 billing cycle breakdown
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Collected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Pending
              </span>
            </div>
          </div>

          <div className="space-y-2.5 tabular-nums">
            {data.feeByClass.map((row) => {
              const collectedPct = Math.round((row.collected / maxFeeTotal) * 100);
              const pendingPct = Math.round((row.pending / maxFeeTotal) * 100);
              return (
                <div key={row.className} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {row.className}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {formatPKR(row.collected)} / {formatPKR(row.collected + row.pending)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-sm bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className="bg-emerald-600 h-full"
                      style={{ width: `${collectedPct}%` }}
                      title={`Collected: ${formatPKR(row.collected)}`}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${pendingPct}%` }}
                      title={`Pending: ${formatPKR(row.pending)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notices, Upcoming PTM & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Institutional Notices & Events
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('communication')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              View Notice Board
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.notices.map((n) => (
              <div key={n.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>{n.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Audience: {n.audience}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{n.publishDate}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {n.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {n.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Upcoming Parent-Teacher Conferences
            </h2>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.upcomingPtm.map((ptm) => (
              <div key={ptm.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {ptm.title}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {ptm.date}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {ptm.timeSlot} · Room {ptm.room} · {ptm.notes}
                </p>
              </div>
            ))}
          </div>

          {data.recentLogs.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Recent Audit Trail
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('security')}
                  className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
                >
                  All Logs
                </button>
              </div>
              <div className="space-y-2">
                {data.recentLogs.slice(0, 3).map((lg) => (
                  <div
                    key={lg.id}
                    className="flex items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400"
                  >
                    <span className="truncate">
                      <strong className="font-medium text-slate-800 dark:text-slate-200">
                        {lg.actorName}
                      </strong>{' '}
                      — {lg.action}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] shrink-0">
                      {lg.createdAt.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
