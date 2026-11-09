import React, { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Printer, Search, X } from 'lucide-react';
import { LeaveRequest, PayrollRecord, StaffMember, UserRole } from '../types/index.ts';
import { apiRequest, formatPKR } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { PrintPreviewModal } from '../components/ui/PrintPreviewModal.tsx';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePositiveAmount,
} from '../lib/validation.ts';

type HrTab = 'directory' | 'payroll' | 'leaves';

export function StaffPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const isAdmin = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const canPay = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT);

  const [tab, setTab] = useState<HrTab>('directory');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  const [search, setSearch] = useState('');
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [payslipItem, setPayslipItem] = useState<PayrollRecord | null>(null);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: 'Subject Teacher',
    department: 'Sciences',
    qualification: 'M.Sc / B.Ed',
    baseSalary: 95000,
    allowances: 12000,
  });

  const [editStaffForm, setEditStaffForm] = useState({
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    qualification: '',
    joinDate: '',
    baseSalary: 0,
    allowances: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED',
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual Leave',
    fromDate: '2026-11-10',
    toDate: '2026-11-11',
    reason: '',
  });

  useEffect(() => {
    apiRequest<{
      staff: StaffMember[];
      payroll: PayrollRecord[];
      leaveRequests: LeaveRequest[];
    }>('/staff')
      .then((res) => {
        setStaff(res.staff);
        setPayroll(res.payroll);
        setLeaves(res.leaveRequests);
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [staff, search]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation
    const nameCheck = validateFullName(staffForm.name, 'Staff Full Name');
    if (!nameCheck.valid) {
      notify(nameCheck.error!, 'error');
      return;
    }
    const emailCheck = validateEmail(staffForm.email, 'Official Staff Email');
    if (!emailCheck.valid) {
      notify(emailCheck.error!, 'error');
      return;
    }
    const phoneCheck = validatePhoneNumber(staffForm.phone, 'Phone Number');
    if (!phoneCheck.valid) {
      notify(phoneCheck.error!, 'error');
      return;
    }
    const desig = staffForm.designation.trim();
    if (desig.length < 2) {
      notify('Designation must be at least 2 characters long.', 'error');
      return;
    }
    const salCheck = validatePositiveAmount(staffForm.baseSalary, 'Base Salary');
    if (!salCheck.valid) {
      notify(salCheck.error!, 'error');
      return;
    }
    const allowCheck = validatePositiveAmount(staffForm.allowances, 'Allowances');
    if (!allowCheck.valid) {
      notify(allowCheck.error!, 'error');
      return;
    }

    try {
      const res = await apiRequest<{ staffMember: StaffMember }>('/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setStaff((prev) => [...prev, res.staffMember]);
      setAddStaffOpen(false);
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        designation: 'Subject Teacher',
        department: 'Sciences',
        qualification: 'M.Sc / B.Ed',
        baseSalary: 95000,
        allowances: 12000,
      });
      notify(`Onboarded ${res.staffMember.name}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const openEditStaffModal = (emp: StaffMember) => {
    setEditingStaff(emp);
    setEditStaffForm({
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department,
      qualification: emp.qualification,
      joinDate: emp.joinDate,
      baseSalary: emp.baseSalary,
      allowances: emp.allowances,
      status: emp.status,
    });
  };

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    // Validate edited fields
    const nameCheck = validateFullName(editStaffForm.name, 'Staff Full Name');
    if (!nameCheck.valid) {
      notify(nameCheck.error!, 'error');
      return;
    }
    const emailCheck = validateEmail(editStaffForm.email, 'Official Staff Email');
    if (!emailCheck.valid) {
      notify(emailCheck.error!, 'error');
      return;
    }
    const phoneCheck = validatePhoneNumber(editStaffForm.phone, 'Phone Number');
    if (!phoneCheck.valid) {
      notify(phoneCheck.error!, 'error');
      return;
    }
    const desig = editStaffForm.designation.trim();
    if (desig.length < 2) {
      notify('Designation must be at least 2 characters long.', 'error');
      return;
    }
    const salCheck = validatePositiveAmount(editStaffForm.baseSalary, 'Base Salary');
    if (!salCheck.valid) {
      notify(salCheck.error!, 'error');
      return;
    }
    const allowCheck = validatePositiveAmount(editStaffForm.allowances, 'Allowances');
    if (!allowCheck.valid) {
      notify(allowCheck.error!, 'error');
      return;
    }

    try {
      const res = await apiRequest<{ staffMember: StaffMember; payroll: PayrollRecord[] }>(
        `/staff/${editingStaff.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(editStaffForm),
        }
      );
      setStaff((prev) =>
        prev.map((s) => (s.id === res.staffMember.id ? res.staffMember : s))
      );
      if (res.payroll) {
        setPayroll(res.payroll);
      }
      setEditingStaff(null);
      notify(`Updated staff information for ${res.staffMember.name}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDisburseSalary = async (id: string) => {
    try {
      const res = await apiRequest<{ payrollRecord: PayrollRecord }>(
        `/staff/payroll/${id}/pay`,
        { method: 'POST' }
      );
      setPayroll((prev) =>
        prev.map((p) => (p.id === id ? res.payrollRecord : p))
      );
      notify('Salary disbursed and payslip finalized.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ leaveRequest: LeaveRequest }>('/staff/leaves', {
        method: 'POST',
        body: JSON.stringify(leaveForm),
      });
      setLeaves((prev) => [res.leaveRequest, ...prev]);
      setLeaveForm((p) => ({ ...p, reason: '' }));
      notify('Leave request submitted for Principal review.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleReviewLeave = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await apiRequest<{ leaveRequest: LeaveRequest }>(
        `/staff/leaves/${id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ status }),
        }
      );
      setLeaves((prev) => prev.map((l) => (l.id === id ? res.leaveRequest : l)));
      notify(`Leave request ${status.toLowerCase()}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const findStaff = (id: string) => staff.find((s) => s.id === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Staff, HR & Payroll Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Faculty & employee records, monthly salary disbursement with printable payslips, and leave approvals.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTab('directory')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'directory'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Faculty & Staff
          </button>
          {canPay && (
            <button
              type="button"
              onClick={() => setTab('payroll')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'payroll'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Salary & Payslips
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('leaves')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'leaves'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Leave Requests
          </button>
        </div>
      </div>

      {/* TAB 1: DIRECTORY */}
      {tab === 'directory' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name, employee code, designation, or email..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setAddStaffOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Staff Member
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation & Dept</th>
                    <th className="py-3 px-4">Qualification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Gross Package</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredStaff.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono">{emp.employeeCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {emp.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {emp.email} · {emp.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{emp.designation}</div>
                        <div className="text-[11px] text-slate-500">{emp.department}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {emp.qualification}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            emp.status === 'ACTIVE'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : emp.status === 'ON_LEAVE'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatPKR(emp.baseSalary + emp.allowances)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditStaffModal(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYROLL & PAYSLIPS */}
      {tab === 'payroll' && canPay && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4 text-right">Base + Allowances</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {payroll.map((p) => {
                  const emp = findStaff(p.staffId);
                  return (
                    <tr key={p.id}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {emp?.name || p.staffId}
                        </div>
                        <div className="text-[11px] text-slate-500">{emp?.designation}</div>
                      </td>
                      <td className="py-3 px-4">{p.month}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatPKR(p.baseSalary + p.allowances)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-red-600">
                        -{formatPKR(p.deductions)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatPKR(p.netSalary)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            p.status === 'PAID'
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-amber-700 dark:text-amber-400 font-semibold'
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {p.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleDisburseSalary(p.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-medium whitespace-nowrap"
                            >
                              <Check className="w-3 h-3" />
                              Disburse
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPayslipItem(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <Printer className="w-3 h-3" />
                            Payslip
                          </button>
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

      {/* TAB 3: LEAVE REQUESTS */}
      {tab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSubmitLeave}
            className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs self-start"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Submit Staff Leave Application
            </h3>
            <div>
              <label className="block mb-1">Leave Category</label>
              <select
                value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Academic Leave">Academic Leave</option>
                <option value="Annual Leave">Annual Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1">Reason</label>
              <textarea
                rows={3}
                required
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Reason for leave & substitute cover notes..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-blue-700 text-white font-medium"
            >
              Submit Application
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {leaves.map((lv) => {
              const emp = findStaff(lv.staffId);
              return (
                <div key={lv.id} className="p-5 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      {emp?.name || lv.staffId} · {lv.leaveType}
                    </div>
                    <div className="font-mono text-slate-500 mt-0.5">
                      {lv.fromDate} to {lv.toDate}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1.5">{lv.reason}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end justify-between gap-2 shrink-0">
                    <span
                      className={`font-semibold ${
                        lv.status === 'APPROVED'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : lv.status === 'REJECTED'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {lv.status}
                    </span>

                    {isAdmin && lv.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(lv.id, 'APPROVED')}
                          className="px-3 py-1 rounded bg-emerald-600 text-white font-medium"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(lv.id, 'REJECTED')}
                          className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {addStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Onboard Faculty / Staff</h3>
              <button type="button" onClick={() => setAddStaffOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Full Name *</label>
                  <input
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. Dr. Anwar Baloch"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="name@gbpskl.edu.pk"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Phone</label>
                  <input
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+92-300-0000000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Designation *</label>
                  <input
                    required
                    value={staffForm.designation}
                    onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                    placeholder="Designation"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Department</label>
                  <input
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    placeholder="Department"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Qualification</label>
                  <input
                    value={staffForm.qualification}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, qualification: e.target.value })
                    }
                    placeholder="Qualification"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Base Salary (PKR)</label>
                  <input
                    type="number"
                    value={staffForm.baseSalary}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, baseSalary: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Allowances (PKR)</label>
                  <input
                    type="number"
                    value={staffForm.allowances}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, allowances: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddStaffOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
                >
                  Save Staff Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Information Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Edit Staff Information
                </h3>
                <p className="text-xs text-slate-500">
                  Update employee profile, contact details, designation, qualification, and salary package.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Full Name *</label>
                  <input
                    required
                    value={editStaffForm.name}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Employee Code *</label>
                  <input
                    required
                    value={editStaffForm.employeeCode}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, employeeCode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editStaffForm.email}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Phone Number</label>
                  <input
                    value={editStaffForm.phone}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Designation *</label>
                  <input
                    required
                    value={editStaffForm.designation}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, designation: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Department</label>
                  <input
                    value={editStaffForm.department}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, department: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Qualification</label>
                  <input
                    value={editStaffForm.qualification}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, qualification: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Join Date</label>
                  <input
                    type="date"
                    value={editStaffForm.joinDate}
                    onChange={(e) =>
                      setEditStaffForm({ ...editStaffForm, joinDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Base Salary (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={editStaffForm.baseSalary}
                    onChange={(e) =>
                      setEditStaffForm({
                        ...editStaffForm,
                        baseSalary: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Allowances (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={editStaffForm.allowances}
                    onChange={(e) =>
                      setEditStaffForm({
                        ...editStaffForm,
                        allowances: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Employment Status</label>
                  <select
                    value={editStaffForm.status}
                    onChange={(e) =>
                      setEditStaffForm({
                        ...editStaffForm,
                        status: e.target.value as 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="RESIGNED">RESIGNED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
                >
                  Save Staff Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Official Payslip */}
      <PrintPreviewModal
        open={Boolean(payslipItem)}
        onClose={() => setPayslipItem(null)}
        title="Employee Monthly Salary Payslip"
        documentSubtitle="Human Resources & Payroll Division"
      >
        {payslipItem && (
          <div className="space-y-4 text-xs tabular-nums">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                Employee: <strong>{findStaff(payslipItem.staffId)?.name}</strong>
              </div>
              <div>
                Code: <strong className="font-mono">{findStaff(payslipItem.staffId)?.employeeCode}</strong>
              </div>
              <div>
                Salary Period: <strong>{payslipItem.month}</strong>
              </div>
              <div>
                Disbursement Status: <strong>{payslipItem.status}</strong>
              </div>
            </div>
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2">Basic Pay</td>
                  <td className="py-2 text-right font-mono">{formatPKR(payslipItem.baseSalary)}</td>
                </tr>
                <tr>
                  <td className="py-2">House Rent & Medical Allowances</td>
                  <td className="py-2 text-right font-mono">{formatPKR(payslipItem.allowances)}</td>
                </tr>
                <tr>
                  <td className="py-2">Tax & Provident Fund Deductions</td>
                  <td className="py-2 text-right font-mono">-{formatPKR(payslipItem.deductions)}</td>
                </tr>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="py-2.5">Net Take-Home Salary</td>
                  <td className="py-2.5 text-right font-mono">{formatPKR(payslipItem.netSalary)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </PrintPreviewModal>
    </div>
  );
}
