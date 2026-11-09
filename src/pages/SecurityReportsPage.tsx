import React, { useEffect, useMemo, useState } from 'react';
import { Download, Database, RotateCcw, Search, Upload } from 'lucide-react';
import { ActivityLog, FeeVoucher, Student, UserAccount, UserRole } from '../types/index.ts';
import { apiRequest, exportToExcelCsv, formatRoleLabel } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { PaginationBar } from '../components/ui/PaginationBar.tsx';

type SecTab = 'logs' | 'rbac' | 'backup';

const RBAC_MATRIX = [
  { module: 'Master LMS & School Administration', superAdmin: 'Full Control (Only 1 Admin)', teacher: '—', student: '—' },
  { module: 'Online Quizzes, Lectures & Assignments', superAdmin: 'Create, Grade & Delete', teacher: 'Create, Check Results & Grade', student: 'Attempt Quiz, Submit Work & Read' },
  { module: 'Daily Student Attendance', superAdmin: 'Full Edit & Reports', teacher: 'Mark & Update Attendance', student: 'Read-Only Self Log' },
  { module: 'Exams, Marks & Report Cards', superAdmin: 'Full Schedule & Marks', teacher: 'Enter Marks & Check Standings', student: 'Read-Only Self Result' },
  { module: 'Student Admissions, Fees, HR & Security', superAdmin: 'Full Control + DB Backup', teacher: '—', student: '—' },
];

export function SecurityReportsPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);

  const [tab, setTab] = useState<SecTab>('logs');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const loadSecurityData = () => {
    apiRequest<{ logs: ActivityLog[]; users: UserAccount[] }>('/security/logs')
      .then((res) => {
        setLogs(res.logs);
        setUsers(res.users);
      })
      .catch((err) => notify(err.message, 'error'));
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.actorName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const handleDownloadBackup = async () => {
    try {
      const backup = await apiRequest<any>('/security/backup');
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gbps_kando_lund_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      loadSecurityData();
      notify('Full JSON database backup downloaded.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snapshot = parsed.snapshot || parsed;
      await apiRequest('/security/restore', {
        method: 'POST',
        body: JSON.stringify({ snapshot }),
      });
      loadSecurityData();
      notify('Database snapshot restored successfully.', 'success');
    } catch (err: any) {
      notify(err.message || 'Invalid backup file.', 'error');
    }
  };

  const handleResetDemo = async () => {
    try {
      await apiRequest('/security/reset-seed', { method: 'POST' });
      loadSecurityData();
      notify('Database reset to clean initial demo seed.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportMasterReport = async () => {
    try {
      const [stRes, feeRes] = await Promise.all([
        apiRequest<{ students: Student[] }>('/students'),
        apiRequest<{ feeVouchers: FeeVoucher[] }>('/fees'),
      ]);
      exportToExcelCsv(
        'institutional_master_audit.csv',
        ['Admission No', 'Student', 'Status', 'Total Billed (PKR)', 'Total Paid (PKR)'],
        stRes.students.map((s) => {
          const vs = feeRes.feeVouchers.filter((v) => v.studentId === s.id);
          return [
            s.admissionNo,
            s.name,
            s.status,
            vs.reduce((sum, x) => sum + x.netAmount, 0),
            vs.reduce((sum, x) => sum + x.paidAmount, 0),
          ];
        })
      );
      notify('Master Student & Finance Excel CSV exported.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reports, RBAC & Data Security
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Audit activity logs, bcrypt-hashed RBAC accounts, cross-module exports, and JSON database backups.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'logs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Activity Audit Logs
          </button>
          <button
            type="button"
            onClick={() => setTab('rbac')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'rbac'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            RBAC Matrix & Accounts
          </button>
          <button
            type="button"
            onClick={() => setTab('backup')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'backup'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Reports & DB Backup
          </button>
        </div>
      </div>

      {/* TAB 1: AUDIT LOGS */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter logs by user, module, or action..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                exportToExcelCsv(
                  'activity_audit_logs.csv',
                  ['Timestamp', 'Actor', 'Role', 'Module', 'Action', 'Details', 'IP'],
                  filteredLogs.map((l) => [
                    l.createdAt,
                    l.actorName,
                    l.actorRole,
                    l.module,
                    l.action,
                    l.details,
                    l.ipAddress,
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit CSV
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor & Role</th>
                    <th className="py-3 px-4">Module / Action</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {paginatedLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {l.createdAt.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{l.actorName}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatRoleLabel(l.actorRole)} · {l.ipAddress}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-blue-700 dark:text-blue-400">
                          {l.action}
                        </div>
                        <div className="text-[11px] text-slate-500">{l.module}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {l.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={page}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* TAB 2: RBAC PERMISSIONS MATRIX */}
      {tab === 'rbac' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
              Role-Based Access Control (RBAC) Enforcement Matrix
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-2.5 px-4">LMS Module</th>
                    <th className="py-2.5 px-4">Super Admin (1 Controller)</th>
                    <th className="py-2.5 px-4">Teacher Portal</th>
                    <th className="py-2.5 px-4">Student Portal (Limited)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {RBAC_MATRIX.map((r) => (
                    <tr key={r.module}>
                      <td className="py-2.5 px-4 font-semibold">{r.module}</td>
                      <td className="py-2.5 px-4 text-emerald-700 dark:text-emerald-400 font-medium">{r.superAdmin}</td>
                      <td className="py-2.5 px-4">{r.teacher}</td>
                      <td className="py-2.5 px-4">{r.student}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
              Provisioned LMS Accounts (1 Super Admin · Teacher IDs · Student ID Logins)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 px-4">Account Holder</th>
                    <th className="py-2.5 px-4">Login ID (Student ID / Emp Code)</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Assigned Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-4 font-semibold">{u.name}</td>
                      <td className="py-2.5 px-4 font-mono text-blue-700 dark:text-blue-400">
                        {u.loginId || u.email}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{u.email}</td>
                      <td className="py-2.5 px-4">{formatRoleLabel(u.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP, RESTORE & MASTER EXPORTS */}
      {tab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h3 className="text-sm font-semibold">Database Snapshot Backup & Restore</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Export a complete relational JSON snapshot containing all users, students, attendance sheets, exam marks, fee vouchers, and logs.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download Backup (.json)
              </button>

              {isSuperAdmin && (
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restore Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                </label>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Seed
                </button>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold">Consolidated Master Audit Export</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Generate a cross-table student enrollment and financial fee reconciliation spreadsheet compatible with Microsoft Excel and Google Sheets.
            </p>
            <button
              type="button"
              onClick={handleExportMasterReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Export Master Reconciliation (Excel CSV)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
