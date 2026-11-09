import { useEffect, useMemo, useState } from 'react';
import { Check, Download, Printer, Bell } from 'lucide-react';
import {
  AttendanceStatus,
  SchoolClass,
  StaffAttendance,
  StaffMember,
  Student,
  StudentAttendance,
  UserRole,
} from '../types/index.ts';
import { apiRequest, exportToExcelCsv } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { PrintPreviewModal } from '../components/ui/PrintPreviewModal.tsx';

type TabKey = 'students' | 'staff' | 'monthly';

export function AttendancePage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const canMarkStaff = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);

  const [tab, setTab] = useState<TabKey>('students');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [studentAtt, setStudentAtt] = useState<StudentAttendance[]>([]);
  const [staffAtt, setStaffAtt] = useState<StaffAttendance[]>([]);

  const [selectedDate, setSelectedDate] = useState('2026-10-24');
  const [selectedClassId, setSelectedClassId] = useState('cls-10a');
  const [autoNotifyParents, setAutoNotifyParents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printReportOpen, setPrintReportOpen] = useState(false);

  // Draft attendance map for currently selected date & class
  const [draftStudentStatus, setDraftStudentStatus] = useState<Record<string, AttendanceStatus>>({});
  const [draftStudentRemarks, setDraftStudentRemarks] = useState<Record<string, string>>({});

  // Draft staff attendance
  const [draftStaffStatus, setDraftStaffStatus] = useState<Record<string, AttendanceStatus>>({});
  const [draftStaffCheckIn, setDraftStaffCheckIn] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      apiRequest<{ students: Student[]; classes: SchoolClass[] }>('/students'),
      apiRequest<{ staff: StaffMember[] }>('/bootstrap'),
      apiRequest<{
        studentAttendance: StudentAttendance[];
        staffAttendance: StaffAttendance[];
      }>('/attendance'),
    ])
      .then(([stRes, bootRes, attRes]) => {
        setStudents(stRes.students);
        setClasses(stRes.classes);
        setStaff(bootRes.staff);
        setStudentAtt(attRes.studentAttendance);
        setStaffAtt(attRes.staffAttendance);
        if (stRes.classes[0] && !stRes.classes.some((c) => c.id === selectedClassId)) {
          setSelectedClassId(stRes.classes[0].id);
        }
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  const classStudents = useMemo(
    () =>
      students.filter(
        (s) => s.classId === selectedClassId && s.status === 'ACTIVE'
      ),
    [students, selectedClassId]
  );

  // Sync draft state when date or class changes
  useEffect(() => {
    const statusMap: Record<string, AttendanceStatus> = {};
    const remarksMap: Record<string, string> = {};
    classStudents.forEach((s) => {
      const existing = studentAtt.find(
        (a) => a.studentId === s.id && a.date === selectedDate
      );
      statusMap[s.id] = existing?.status || 'PRESENT';
      remarksMap[s.id] = existing?.remarks || '';
    });
    setDraftStudentStatus(statusMap);
    setDraftStudentRemarks(remarksMap);
  }, [classStudents, studentAtt, selectedDate]);

  useEffect(() => {
    const sMap: Record<string, AttendanceStatus> = {};
    const cMap: Record<string, string> = {};
    staff.forEach((emp) => {
      const ex = staffAtt.find((a) => a.staffId === emp.id && a.date === selectedDate);
      sMap[emp.id] = ex?.status || 'PRESENT';
      cMap[emp.id] = ex?.checkIn || '07:55';
    });
    setDraftStaffStatus(sMap);
    setDraftStaffCheckIn(cMap);
  }, [staff, staffAtt, selectedDate]);

  const handleSaveStudentAttendance = async () => {
    setSaving(true);
    try {
      const records = classStudents.map((s) => ({
        studentId: s.id,
        status: draftStudentStatus[s.id] || 'PRESENT',
        remarks: draftStudentRemarks[s.id] || '',
      }));
      const res = await apiRequest<{
        studentAttendance: StudentAttendance[];
        notificationsDispatched: number;
      }>('/attendance/students', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClassId,
          autoNotifyParents,
          records,
        }),
      });
      setStudentAtt(res.studentAttendance);
      notify(
        res.notificationsDispatched > 0
          ? `Attendance saved. ${res.notificationsDispatched} automated Parent SMS alert(s) dispatched.`
          : 'Daily student attendance saved.',
        'success'
      );
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStaffAttendance = async () => {
    setSaving(true);
    try {
      const records = staff.map((emp) => ({
        staffId: emp.id,
        status: draftStaffStatus[emp.id] || 'PRESENT',
        checkIn: draftStaffCheckIn[emp.id] || '07:55',
      }));
      const res = await apiRequest<{ staffAttendance: StaffAttendance[] }>(
        '/attendance/staff',
        {
          method: 'POST',
          body: JSON.stringify({ date: selectedDate, records }),
        }
      );
      setStaffAtt(res.staffAttendance);
      notify('Staff attendance sheet saved.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Monthly Attendance summary per student
  const monthlySummary = useMemo(() => {
    return students
      .filter((s) => selectedClassId === 'ALL' || s.classId === selectedClassId)
      .map((s) => {
        const records = studentAtt.filter((a) => a.studentId === s.id);
        const present = records.filter((r) => r.status === 'PRESENT').length;
        const absent = records.filter((r) => r.status === 'ABSENT').length;
        const late = records.filter((r) => r.status === 'LATE').length;
        const leave = records.filter((r) => r.status === 'LEAVE').length;
        const total = records.length;
        const rate =
          total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 100;
        return { student: s, present, absent, late, leave, total, rate };
      });
  }, [students, studentAtt, selectedClassId]);

  const handleExportMonthlyExcel = () => {
    exportToExcelCsv(
      `monthly_attendance_${selectedClassId}.csv`,
      ['Roll No', 'Student Name', 'Present', 'Absent', 'Late', 'Leave', 'Total Days', 'Attendance %'],
      monthlySummary.map((r) => [
        r.student.rollNo,
        r.student.name,
        r.present,
        r.absent,
        r.late,
        r.leave,
        r.total,
        `${r.rate}%`,
      ])
    );
  };

  const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance & Absence Alerts
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Daily student & staff registers, automated parent SMS/Email absence alerts, and monthly reports.
          </p>
        </div>

        {/* Interactive Segmented Tab Control */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTab('students')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'students'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Student Register
          </button>
          {canMarkStaff && (
            <button
              type="button"
              onClick={() => setTab('staff')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'staff'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Staff Register
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'monthly'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Monthly Report
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {tab !== 'staff' && (
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - Section {c.section}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tab !== 'monthly' && (
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Attendance Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
            </div>
          )}

          {tab === 'students' && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={autoNotifyParents}
                onChange={(e) => setAutoNotifyParents(e.target.checked)}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <Bell className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Auto-send SMS/Email to guardian when marked Absent</span>
            </label>
          )}
        </div>

        {tab === 'students' && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveStudentAttendance}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Student Attendance'}
          </button>
        )}

        {tab === 'staff' && canMarkStaff && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveStaffAttendance}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Staff Attendance'}
          </button>
        )}

        {tab === 'monthly' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportMonthlyExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => setPrintReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Print PDF Report
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: Student Daily Attendance */}
      {tab === 'students' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Guardian SMS Contact</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No active students enrolled in this class.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((s) => {
                    const current = draftStudentStatus[s.id] || 'PRESENT';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono tabular-nums font-medium">
                          {s.rollNo}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {s.name}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                          {s.guardianPhone}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {statuses.map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setDraftStudentStatus((prev) => ({ ...prev, [s.id]: st }))
                                }
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                                  current === st
                                    ? st === 'ABSENT'
                                      ? 'bg-red-600 text-white'
                                      : st === 'LATE'
                                      ? 'bg-amber-600 text-white'
                                      : st === 'LEAVE'
                                      ? 'bg-slate-700 text-white'
                                      : 'bg-emerald-600 text-white'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={draftStudentRemarks[s.id] || ''}
                            onChange={(e) =>
                              setDraftStudentRemarks((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            placeholder="Optional note..."
                            className="w-full max-w-[200px] px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Staff Daily Attendance */}
      {tab === 'staff' && canMarkStaff && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {staff.map((emp) => {
                  const current = draftStaffStatus[emp.id] || 'PRESENT';
                  return (
                    <tr key={emp.id}>
                      <td className="py-3 px-4 font-mono tabular-nums">{emp.employeeCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {emp.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {emp.department}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={draftStaffCheckIn[emp.id] || '07:55'}
                          onChange={(e) =>
                            setDraftStaffCheckIn((prev) => ({
                              ...prev,
                              [emp.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {statuses.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setDraftStaffStatus((prev) => ({ ...prev, [emp.id]: st }))
                              }
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                current === st
                                  ? st === 'ABSENT'
                                    ? 'bg-red-600 text-white'
                                    : st === 'LATE'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Monthly Attendance Summary */}
      {tab === 'monthly' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-right">Present</th>
                  <th className="py-3 px-4 text-right">Absent</th>
                  <th className="py-3 px-4 text-right">Late</th>
                  <th className="py-3 px-4 text-right">Leave</th>
                  <th className="py-3 px-4 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {monthlySummary.map((row) => (
                  <tr key={row.student.id}>
                    <td className="py-3 px-4 font-mono">{row.student.rollNo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {row.student.name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {row.present}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-700 dark:text-red-400">
                      {row.absent}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                      {row.late}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{row.leave}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {row.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable PDF Monthly Report */}
      <PrintPreviewModal
        open={printReportOpen}
        onClose={() => setPrintReportOpen(false)}
        title="Monthly Student Attendance Report"
        documentSubtitle="Academic Attendance Summary · October 2026"
      >
        <table className="w-full text-left border-collapse text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="py-2">Roll No</th>
              <th className="py-2">Student Name</th>
              <th className="py-2 text-right">Present</th>
              <th className="py-2 text-right">Absent</th>
              <th className="py-2 text-right">Late</th>
              <th className="py-2 text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {monthlySummary.map((r) => (
              <tr key={r.student.id}>
                <td className="py-2 font-mono">{r.student.rollNo}</td>
                <td className="py-2 font-medium">{r.student.name}</td>
                <td className="py-2 text-right font-mono">{r.present}</td>
                <td className="py-2 text-right font-mono">{r.absent}</td>
                <td className="py-2 text-right font-mono">{r.late}</td>
                <td className="py-2 text-right font-mono font-semibold">{r.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintPreviewModal>
    </div>
  );
}
