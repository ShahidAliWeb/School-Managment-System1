import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react';
import {
  FeeStructure,
  FeeVoucher,
  SchoolClass,
  Student,
  UserRole,
} from '../types/index.ts';
import { apiRequest, exportToExcelCsv, formatPKR } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { PaginationBar } from '../components/ui/PaginationBar.tsx';
import { PrintPreviewModal } from '../components/ui/PrintPreviewModal.tsx';

type FeeTab = 'vouchers' | 'defaulters' | 'structures';

export function FeesPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const canManageFees = hasRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT
  );

  const [tab, setTab] = useState<FeeTab>('vouchers');
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [createVoucherOpen, setCreateVoucherOpen] = useState(false);
  const [payModalVoucher, setPayModalVoucher] = useState<FeeVoucher | null>(null);
  const [printVoucher, setPrintVoucher] = useState<FeeVoucher | null>(null);

  // Issue voucher form
  const [voucherForm, setVoucherForm] = useState({
    studentId: '',
    billingMonth: 'November 2026',
    dueDate: '2026-11-10',
    extraDiscount: 0,
    lateFine: 0,
  });

  // Payment gateway form
  const [paymentMethod, setPaymentMethod] = useState<
    'JazzCash' | 'Easypaisa' | 'Bank Transfer' | 'Cash'
  >('JazzCash');
  const [walletAccount, setWalletAccount] = useState('0300-9214450');
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Fee structure form
  const [structForm, setStructForm] = useState({
    classId: 'cls-10a',
    tuitionFee: 18500,
    labFee: 2500,
    libraryFee: 1000,
    examFee: 1500,
    lateFinePerDay: 150,
  });

  useEffect(() => {
    Promise.all([
      apiRequest<{ feeStructures: FeeStructure[]; feeVouchers: FeeVoucher[] }>('/fees'),
      apiRequest<{ students: Student[]; classes: SchoolClass[] }>('/students'),
    ])
      .then(([feeRes, stRes]) => {
        setStructures(feeRes.feeStructures);
        setVouchers(feeRes.feeVouchers);
        setStudents(stRes.students);
        setClasses(stRes.classes);
        if (stRes.students[0]) {
          setVoucherForm((p) => ({ ...p, studentId: stRes.students[0].id }));
        }
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  const studentMap = useMemo(() => {
    const m: Record<string, Student> = {};
    students.forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [students]);

  const classMap = useMemo(() => {
    const m: Record<string, SchoolClass> = {};
    classes.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [classes]);

  const filteredVouchers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (tab === 'defaulters' && v.status === 'PAID') return false;
      if (tab === 'vouchers' && statusFilter !== 'ALL' && v.status !== statusFilter)
        return false;
      if (!q) return true;
      const st = studentMap[v.studentId];
      return (
        v.voucherNo.toLowerCase().includes(q) ||
        v.billingMonth.toLowerCase().includes(q) ||
        (st && st.name.toLowerCase().includes(q)) ||
        (st && st.rollNo.toLowerCase().includes(q))
      );
    });
  }, [vouchers, tab, statusFilter, search, studentMap]);

  const paginatedVouchers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, page, pageSize]);

  const totals = useMemo(() => {
    const net = vouchers.reduce((s, v) => s + v.netAmount, 0);
    const paid = vouchers.reduce((s, v) => s + v.paidAmount, 0);
    return { net, paid, balance: Math.max(0, net - paid) };
  }, [vouchers]);

  const handleIssueVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ voucher: FeeVoucher }>('/fees/vouchers', {
        method: 'POST',
        body: JSON.stringify(voucherForm),
      });
      setVouchers((prev) => [res.voucher, ...prev]);
      setCreateVoucherOpen(false);
      notify(`Generated voucher ${res.voucher.voucherNo}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalVoucher) return;
    try {
      const prefix =
        paymentMethod === 'JazzCash'
          ? 'JC'
          : paymentMethod === 'Easypaisa'
          ? 'EP'
          : paymentMethod === 'Bank Transfer'
          ? 'HBL'
          : 'CSH';
      const res = await apiRequest<{ voucher: FeeVoucher }>(
        `/fees/vouchers/${payModalVoucher.id}/pay`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: paymentAmount,
            paymentMethod,
            paymentReference: `${prefix}-${Date.now().toString().slice(-7)}`,
          }),
        }
      );
      setVouchers((prev) =>
        prev.map((v) => (v.id === res.voucher.id ? res.voucher : v))
      );
      setPayModalVoucher(null);
      setPrintVoucher(res.voucher);
      notify(`Payment recorded via ${paymentMethod}. Receipt ready.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ feeStructure: FeeStructure }>('/fees/structures', {
        method: 'POST',
        body: JSON.stringify(structForm),
      });
      setStructures((prev) => {
        const exists = prev.some((f) => f.classId === res.feeStructure.classId);
        return exists
          ? prev.map((f) =>
              f.classId === res.feeStructure.classId ? res.feeStructure : f
            )
          : [...prev, res.feeStructure];
      });
      notify('Class fee structure saved.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportFees = () => {
    exportToExcelCsv(
      `fee_collection_${tab}.csv`,
      [
        'Voucher No',
        'Student',
        'Roll No',
        'Month',
        'Due Date',
        'Discount (PKR)',
        'Late Fine (PKR)',
        'Net Payable (PKR)',
        'Paid (PKR)',
        'Status',
        'Gateway',
      ],
      filteredVouchers.map((v) => {
        const st = studentMap[v.studentId];
        return [
          v.voucherNo,
          st?.name || v.studentId,
          st?.rollNo || '',
          v.billingMonth,
          v.dueDate,
          v.discountAmount,
          v.lateFine,
          v.netAmount,
          v.paidAmount,
          v.status,
          v.paymentMethod || '—',
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fee Ledger, Vouchers & Online Payments
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Class fee structures, scholarships, defaulters tracking, and JazzCash / Easypaisa / Bank receipts.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => {
              setTab('vouchers');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'vouchers'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All Vouchers
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('defaulters');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'defaulters'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Defaulters List
          </button>
          {canManageFees && (
            <button
              type="button"
              onClick={() => setTab('structures')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'structures'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fee Structures
            </button>
          )}
        </div>
      </div>

      {/* Collection KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500">Total Billed (Net of Scholarships)</div>
          <div className="mt-1 font-mono text-xl font-semibold">
            {formatPKR(totals.net)}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500">Total Collected</div>
          <div className="mt-1 font-mono text-xl font-semibold text-emerald-700 dark:text-emerald-400">
            {formatPKR(totals.paid)}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500">Outstanding Receivables</div>
          <div className="mt-1 font-mono text-xl font-semibold text-amber-700 dark:text-amber-400">
            {formatPKR(totals.balance)}
          </div>
        </div>
      </div>

      {tab !== 'structures' ? (
        <>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search voucher no, student name, or month..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              {tab === 'vouchers' && (
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportFees}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Export Report
              </button>
              {canManageFees && (
                <button
                  type="button"
                  onClick={() => setCreateVoucherOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Issue Fee Voucher
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Month / Due</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4">Status / Gateway</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {paginatedVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No fee vouchers match your filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((v) => {
                      const st = studentMap[v.studentId];
                      const balance = Math.max(0, v.netAmount - v.paidAmount);
                      return (
                        <tr
                          key={v.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-4 font-mono font-medium">
                            {v.voucherNo}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {st?.name || v.studentId}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {st?.rollNo}
                              {v.discountAmount > 0
                                ? ` · Disc ${formatPKR(v.discountAmount)}`
                                : ''}
                              {v.lateFine > 0 ? ` · Fine ${formatPKR(v.lateFine)}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{v.billingMonth}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Due {v.dueDate}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">
                            {formatPKR(v.netAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                            {formatPKR(v.paidAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                v.status === 'PAID'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : v.status === 'OVERDUE'
                                  ? 'text-red-700 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {v.status}
                            </span>
                            {v.paymentMethod && (
                              <span className="text-slate-500"> · {v.paymentMethod}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {v.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayModalVoucher(v);
                                    setPaymentAmount(balance);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-700 text-white font-medium whitespace-nowrap"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Pay Online
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setPrintVoucher(v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                              >
                                <Printer className="w-3 h-3" />
                                {v.status === 'PAID' ? 'Receipt' : 'Voucher'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={page}
              totalItems={filteredVouchers.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      ) : (
        /* TAB 3: FEE STRUCTURES PER CLASS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-right">Tuition</th>
                  <th className="py-3 px-4 text-right">Lab + Lib + Exam</th>
                  <th className="py-3 px-4 text-right">Total Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {structures.map((fs) => {
                  const cls = classMap[fs.classId];
                  const extras = fs.labFee + fs.libraryFee + fs.examFee;
                  return (
                    <tr key={fs.id}>
                      <td className="py-3 px-4 font-semibold">
                        {cls ? `${cls.name} - Section ${cls.section}` : fs.classId}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatPKR(fs.tuitionFee)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatPKR(extras)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatPKR(fs.tuitionFee + extras)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={handleSaveStructure}
            className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Update Class Fee Structure
            </h3>
            <div>
              <label className="block mb-1">Class</label>
              <select
                value={structForm.classId}
                onChange={(e) => setStructForm({ ...structForm, classId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - Section {c.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">Tuition Fee (PKR)</label>
                <input
                  type="number"
                  value={structForm.tuitionFee}
                  onChange={(e) =>
                    setStructForm({ ...structForm, tuitionFee: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block mb-1">Science/IT Lab Fee</label>
                <input
                  type="number"
                  value={structForm.labFee}
                  onChange={(e) =>
                    setStructForm({ ...structForm, labFee: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-blue-700 text-white font-medium"
            >
              Save Structure
            </button>
          </form>
        </div>
      )}

      {/* Issue Voucher Modal */}
      {createVoucherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Generate Monthly Fee Voucher</h3>
              <button type="button" onClick={() => setCreateVoucherOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleIssueVoucher} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Student</label>
                <select
                  value={voucherForm.studentId}
                  onChange={(e) =>
                    setVoucherForm({ ...voucherForm, studentId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.rollNo} — {s.name} (Scholarship: {s.scholarshipPercent}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Billing Month</label>
                  <input
                    required
                    value={voucherForm.billingMonth}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, billingMonth: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={voucherForm.dueDate}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Special Discount (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={voucherForm.extraDiscount}
                    onChange={(e) =>
                      setVoucherForm({
                        ...voucherForm,
                        extraDiscount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Late Fine (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={voucherForm.lateFine}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, lateFine: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateVoucherOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
                >
                  Issue Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Online Payment Gateway Integration Modal (JazzCash / Easypaisa / Bank) */}
      {payModalVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold">Fee Payment Gateway</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {payModalVoucher.voucherNo} · {payModalVoucher.billingMonth}
                </p>
              </div>
              <button type="button" onClick={() => setPayModalVoucher(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1.5">Select Payment Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['JazzCash', 'Easypaisa', 'Bank Transfer', 'Cash'] as const).map(
                    (ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setPaymentMethod(ch)}
                        className={`py-2 px-3 rounded-lg border text-left font-medium transition-colors ${
                          paymentMethod === ch
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {ch}
                      </button>
                    )
                  )}
                </div>
              </div>

              {paymentMethod !== 'Cash' && (
                <div>
                  <label className="block font-medium mb-1">
                    {paymentMethod === 'Bank Transfer'
                      ? 'Sender IBAN / HBL Account No'
                      : `${paymentMethod} Mobile Account Number`}
                  </label>
                  <input
                    required
                    value={walletAccount}
                    onChange={(e) => setWalletAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">Amount to Pay (PKR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={payModalVoucher.netAmount - payModalVoucher.paidAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalVoucher(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Confirm {formatPKR(paymentAmount)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Fee Voucher / Official Payment Receipt */}
      <PrintPreviewModal
        open={Boolean(printVoucher)}
        onClose={() => setPrintVoucher(null)}
        title={
          printVoucher?.status === 'PAID'
            ? 'Official Fee Payment Receipt'
            : 'Student Fee Challan / Voucher'
        }
        documentSubtitle="Accounts & Treasury Office · Fee Voucher & Receipt"
      >
        {printVoucher && (
          <div className="space-y-5 text-xs tabular-nums">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                Voucher No: <strong className="font-mono">{printVoucher.voucherNo}</strong>
              </div>
              <div>
                Billing Month: <strong>{printVoucher.billingMonth}</strong>
              </div>
              <div>
                Student: <strong>{studentMap[printVoucher.studentId]?.name}</strong>
              </div>
              <div>
                Due Date: <strong className="font-mono">{printVoucher.dueDate}</strong>
              </div>
            </div>

            <table className="w-full border-collapse">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2">Tuition, Lab, Library & Exam Base Fee</td>
                  <td className="py-2 text-right font-mono">{formatPKR(printVoucher.baseAmount)}</td>
                </tr>
                {printVoucher.transportFee > 0 && (
                  <tr>
                    <td className="py-2">School Transport Charges</td>
                    <td className="py-2 text-right font-mono">{formatPKR(printVoucher.transportFee)}</td>
                  </tr>
                )}
                {printVoucher.hostelFee > 0 && (
                  <tr>
                    <td className="py-2">Hostel Boarding Charges</td>
                    <td className="py-2 text-right font-mono">{formatPKR(printVoucher.hostelFee)}</td>
                  </tr>
                )}
                {printVoucher.discountAmount > 0 && (
                  <tr>
                    <td className="py-2">Scholarship / Concession Discount</td>
                    <td className="py-2 text-right font-mono">-{formatPKR(printVoucher.discountAmount)}</td>
                  </tr>
                )}
                {printVoucher.lateFine > 0 && (
                  <tr>
                    <td className="py-2">Late Payment Surcharge</td>
                    <td className="py-2 text-right font-mono">+{formatPKR(printVoucher.lateFine)}</td>
                  </tr>
                )}
                <tr className="font-bold border-t-2 border-slate-300">
                  <td className="py-2.5">Net Payable Amount</td>
                  <td className="py-2.5 text-right font-mono">{formatPKR(printVoucher.netAmount)}</td>
                </tr>
                <tr>
                  <td className="py-2">Amount Paid ({printVoucher.paymentMethod || 'Pending'})</td>
                  <td className="py-2 text-right font-mono font-semibold">
                    {formatPKR(printVoucher.paidAmount)}
                  </td>
                </tr>
                {printVoucher.paymentReference && (
                  <tr>
                    <td className="py-2">Transaction Reference</td>
                    <td className="py-2 text-right font-mono">{printVoucher.paymentReference}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PrintPreviewModal>
    </div>
  );
}
