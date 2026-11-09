import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  UserPlus,
  Download,
  FileText,
  ArrowUpRight,
  Upload,
  Pencil,
  X,
} from 'lucide-react';
import { SchoolClass, Student, StudentStatus, UserRole } from '../types/index.ts';
import { apiRequest, exportToExcelCsv } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { PaginationBar } from '../components/ui/PaginationBar.tsx';
import { PrintPreviewModal } from '../components/ui/PrintPreviewModal.tsx';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validateDateOfBirth,
  validateAddress,
  validateCNIC,
  validatePercentage,
} from '../lib/validation.ts';

export function StudentsPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const canManage = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [promoteStudent, setPromoteStudent] = useState<Student | null>(null);
  const [certModalStudent, setCertModalStudent] = useState<Student | null>(null);
  const [printCertStudent, setPrintCertStudent] = useState<Student | null>(null);

  // Edit student form state
  const [editForm, setEditForm] = useState({
    name: '',
    rollNo: '',
    admissionNo: '',
    admissionDate: '',
    classId: '',
    gender: 'Male' as 'Male' | 'Female',
    dob: '',
    bloodGroup: 'O+',
    scholarshipPercent: 0,
    status: 'ACTIVE' as StudentStatus,
    guardianName: '',
    guardianRelation: 'Father',
    guardianPhone: '',
    guardianEmail: '',
    guardianCnic: '',
    address: '',
    portalPassword: '',
  });

  // Admission form state
  const [form, setForm] = useState({
    name: '',
    gender: 'Male' as 'Male' | 'Female',
    dob: '2011-05-15',
    admissionDate: '2026-10-24',
    rollNo: '',
    bloodGroup: 'O+',
    classId: '',
    guardianName: '',
    guardianRelation: 'Father',
    guardianPhone: '',
    guardianEmail: '',
    guardianCnic: '',
    address: '',
    scholarshipPercent: 0,
    docTitle: 'B-Form / Birth Certificate',
    docFileName: '',
  });

  // Promotion state
  const [targetClassId, setTargetClassId] = useState('');
  const [newRollNo, setNewRollNo] = useState('');

  // Certificate form state
  const [leavingType, setLeavingType] = useState<'TRANSFER' | 'GRADUATION' | 'WITHDRAWAL'>('TRANSFER');
  const [leavingReason, setLeavingReason] = useState('Family relocation to Islamabad');
  const [leavingConduct, setLeavingConduct] = useState('Exemplary');

  // Document upload inside profile
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFile, setNewDocFile] = useState('');

  const loadData = () => {
    setLoading(true);
    apiRequest<{ students: Student[]; classes: SchoolClass[] }>('/students')
      .then((res) => {
        setStudents(res.students);
        setClasses(res.classes);
        if (!form.classId && res.classes[0]) {
          setForm((prev) => ({ ...prev, classId: res.classes[0].id }));
        }
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const classMap = useMemo(() => {
    const map: Record<string, SchoolClass> = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== 'ALL' && s.classId !== classFilter) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.guardianName.toLowerCase().includes(q) ||
        s.guardianPhone.toLowerCase().includes(q)
      );
    });
  }, [students, search, classFilter, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend real-world data validation
    const nameCheck = validateFullName(form.name, 'Student Full Name');
    if (!nameCheck.valid) {
      notify(nameCheck.error!, 'error');
      return;
    }
    const gNameCheck = validateFullName(form.guardianName, 'Guardian Name');
    if (!gNameCheck.valid) {
      notify(gNameCheck.error!, 'error');
      return;
    }
    const phoneCheck = validatePhoneNumber(form.guardianPhone, 'Guardian Phone');
    if (!phoneCheck.valid) {
      notify(phoneCheck.error!, 'error');
      return;
    }
    if (form.guardianEmail && form.guardianEmail.trim()) {
      const emailCheck = validateEmail(form.guardianEmail, 'Guardian Email');
      if (!emailCheck.valid) {
        notify(emailCheck.error!, 'error');
        return;
      }
    }
    const dobCheck = validateDateOfBirth(form.dob, 'STUDENT', 'Student Date of Birth');
    if (!dobCheck.valid) {
      notify(dobCheck.error!, 'error');
      return;
    }
    if (form.address && form.address.trim()) {
      const addrCheck = validateAddress(form.address, 'Residential Address');
      if (!addrCheck.valid) {
        notify(addrCheck.error!, 'error');
        return;
      }
    }
    if (form.guardianCnic && form.guardianCnic.trim()) {
      const cnicCheck = validateCNIC(form.guardianCnic, 'Guardian CNIC');
      if (!cnicCheck.valid) {
        notify(cnicCheck.error!, 'error');
        return;
      }
    }
    const schCheck = validatePercentage(form.scholarshipPercent, 'Merit Scholarship');
    if (!schCheck.valid) {
      notify(schCheck.error!, 'error');
      return;
    }

    try {
      const documents = form.docFileName
        ? [
            {
              id: `doc-${Date.now()}`,
              title: form.docTitle || 'Admission Document',
              fileName: form.docFileName,
              fileType: form.docFileName.split('.').pop()?.toUpperCase() || 'PDF',
              uploadedAt: new Date().toISOString().slice(0, 10),
              verified: true,
            },
          ]
        : [];

      const res = await apiRequest<{ student: Student }>('/students', {
        method: 'POST',
        body: JSON.stringify({ ...form, documents }),
      });
      setStudents((prev) => [res.student, ...prev]);
      setAdmissionOpen(false);
      notify(`Enrolled ${res.student.name} (${res.student.admissionNo}).`, 'success');
      setForm((prev) => ({
        ...prev,
        name: '',
        rollNo: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        guardianCnic: '',
        address: '',
        scholarshipPercent: 0,
        docFileName: '',
      }));
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const openEditStudentModal = (st: Student) => {
    setEditingStudent(st);
    setEditForm({
      name: st.name,
      rollNo: st.rollNo,
      admissionNo: st.admissionNo,
      admissionDate: st.admissionDate,
      classId: st.classId,
      gender: st.gender,
      dob: st.dob,
      bloodGroup: st.bloodGroup,
      scholarshipPercent: st.scholarshipPercent,
      status: st.status,
      guardianName: st.guardianName,
      guardianRelation: st.guardianRelation,
      guardianPhone: st.guardianPhone,
      guardianEmail: st.guardianEmail,
      guardianCnic: st.guardianCnic,
      address: st.address,
      portalPassword: '',
    });
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    // Validate edited fields
    const nameCheck = validateFullName(editForm.name, 'Student Full Name');
    if (!nameCheck.valid) {
      notify(nameCheck.error!, 'error');
      return;
    }
    const gNameCheck = validateFullName(editForm.guardianName, 'Guardian Name');
    if (!gNameCheck.valid) {
      notify(gNameCheck.error!, 'error');
      return;
    }
    const phoneCheck = validatePhoneNumber(editForm.guardianPhone, 'Guardian Phone');
    if (!phoneCheck.valid) {
      notify(phoneCheck.error!, 'error');
      return;
    }
    if (editForm.guardianEmail && editForm.guardianEmail.trim()) {
      const emailCheck = validateEmail(editForm.guardianEmail, 'Guardian Email');
      if (!emailCheck.valid) {
        notify(emailCheck.error!, 'error');
        return;
      }
    }
    const dobCheck = validateDateOfBirth(editForm.dob, 'STUDENT', 'Student Date of Birth');
    if (!dobCheck.valid) {
      notify(dobCheck.error!, 'error');
      return;
    }
    if (editForm.address && editForm.address.trim()) {
      const addrCheck = validateAddress(editForm.address, 'Residential Address');
      if (!addrCheck.valid) {
        notify(addrCheck.error!, 'error');
        return;
      }
    }
    if (editForm.guardianCnic && editForm.guardianCnic.trim()) {
      const cnicCheck = validateCNIC(editForm.guardianCnic, 'Guardian CNIC');
      if (!cnicCheck.valid) {
        notify(cnicCheck.error!, 'error');
        return;
      }
    }
    const schCheck = validatePercentage(editForm.scholarshipPercent, 'Merit Scholarship');
    if (!schCheck.valid) {
      notify(schCheck.error!, 'error');
      return;
    }

    try {
      const res = await apiRequest<{ student: Student }>(`/students/${editingStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      setStudents((prev) => prev.map((s) => (s.id === res.student.id ? res.student : s)));
      if (selectedStudent?.id === res.student.id) {
        setSelectedStudent(res.student);
      }
      setEditingStudent(null);
      notify(`Updated student information for ${res.student.name}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddStudentDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newDocTitle) return;
    try {
      const updatedDocs = [
        ...selectedStudent.documents,
        {
          id: `doc-${Date.now()}`,
          title: newDocTitle.trim(),
          fileName: newDocFile || `${newDocTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
          fileType: 'PDF',
          uploadedAt: new Date().toISOString().slice(0, 10),
          verified: true,
        },
      ];
      const res = await apiRequest<{ student: Student }>(`/students/${selectedStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify({ documents: updatedDocs }),
      });
      setStudents((prev) => prev.map((s) => (s.id === res.student.id ? res.student : s)));
      setSelectedStudent(res.student);
      setNewDocTitle('');
      setNewDocFile('');
      notify('Document attached to student profile.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteStudent || !targetClassId) return;
    try {
      const res = await apiRequest<{ student: Student }>(
        `/students/${promoteStudent.id}/promote`,
        {
          method: 'POST',
          body: JSON.stringify({ targetClassId, newRollNo }),
        }
      );
      setStudents((prev) => prev.map((s) => (s.id === res.student.id ? res.student : s)));
      setPromoteStudent(null);
      notify(`Promoted ${res.student.name} successfully.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certModalStudent) return;
    try {
      const res = await apiRequest<{ student: Student }>(
        `/students/${certModalStudent.id}/certificate`,
        {
          method: 'POST',
          body: JSON.stringify({
            leavingType,
            reason: leavingReason,
            conduct: leavingConduct,
          }),
        }
      );
      setStudents((prev) => prev.map((s) => (s.id === res.student.id ? res.student : s)));
      setCertModalStudent(null);
      setPrintCertStudent(res.student);
      notify('School Leaving Certificate generated.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportStudents = () => {
    exportToExcelCsv(
      'students_directory.csv',
      [
        'Admission No',
        'Roll No',
        'Student Name',
        'Gender',
        'Class',
        'Guardian Name',
        'Guardian Phone',
        'Scholarship %',
        'Status',
      ],
      filtered.map((s) => {
        const cls = classMap[s.classId];
        return [
          s.admissionNo,
          s.rollNo,
          s.name,
          s.gender,
          cls ? `${cls.name}-${cls.section}` : s.section,
          s.guardianName,
          s.guardianPhone,
          s.scholarshipPercent,
          s.status,
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Admissions, student profiles, guardian records, class promotions, and leaving certificates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportStudents}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel CSV
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setAdmissionOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Admission
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name, admission no, roll no, or guardian..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          aria-label="Filter by Class"
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} - Section {c.section}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="ALUMNI">Alumni</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="py-3 px-4">Roll No (MM-YYYY-NNN)</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Guardian</th>
                <th className="py-3 px-4 text-right">Scholarship</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Loading student records...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No student records match your current search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((st) => {
                  const cls = classMap[st.classId];
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {st.rollNo}
                        </div>
                        <div className="text-[11px] text-slate-500">{st.admissionNo}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {st.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {st.gender} · Blood {st.bloodGroup} · {st.documents.length} docs
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {cls ? `${cls.name} (${cls.section})` : st.section}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200">{st.guardianName}</div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {st.guardianPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {st.scholarshipPercent > 0 ? `${st.scholarshipPercent}%` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            st.status === 'ACTIVE'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(st)}
                            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            Profile
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEditStudentModal(st)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                          )}

                          {canManage && st.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPromoteStudent(st);
                                setTargetClassId(st.classId);
                                setNewRollNo(st.rollNo);
                              }}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap"
                            >
                              Promote
                            </button>
                          )}

                          {st.leavingCertificate ? (
                            <button
                              type="button"
                              onClick={() => setPrintCertStudent(st)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 whitespace-nowrap"
                            >
                              <FileText className="w-3 h-3" />
                              SLC
                            </button>
                          ) : (
                            canManage && (
                              <button
                                type="button"
                                onClick={() => setCertModalStudent(st)}
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                              >
                                Leaving Cert
                              </button>
                            )
                          )}
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
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Admission Form Modal */}
      {admissionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  New Student Admission & Enrollment
                </h2>
                <p className="text-xs text-slate-500">
                  Assign class/section, guardian contacts, scholarship discount, and initial document.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdmissionOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdmissionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Full Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Kamran Ali"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Assign Class & Section *</label>
                  <select
                    required
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - Section {c.section} (Room {c.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Admission Date</label>
                  <input
                    type="date"
                    value={form.admissionDate}
                    onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Roll No (Month-Year-Roll)</label>
                  <input
                    value={form.rollNo}
                    onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                    placeholder={`${form.admissionDate.slice(5, 7) || '10'}-${form.admissionDate.slice(0, 4) || '2026'}-${String(students.length + 1).padStart(3, '0')} (Auto)`}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value as 'Male' | 'Female' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Merit Scholarship (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.scholarshipPercent}
                    onChange={(e) =>
                      setForm({ ...form, scholarshipPercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Guardian Name *</label>
                  <input
                    required
                    value={form.guardianName}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    placeholder="Parent / Guardian Full Name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian Phone (SMS Alerts) *</label>
                  <input
                    required
                    value={form.guardianPhone}
                    onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                    placeholder="+92-300-1234567"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian Email</label>
                  <input
                    type="email"
                    value={form.guardianEmail}
                    onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                    placeholder="guardian@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian CNIC</label>
                  <input
                    value={form.guardianCnic}
                    onChange={(e) => setForm({ ...form, guardianCnic: e.target.value })}
                    placeholder="42201-0000000-1"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Residential Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="House / Street / Sector / City"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Upload Admission Document (B-Form / Transcript)</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setForm({ ...form, docFileName: file.name });
                    }}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 dark:file:border-slate-700 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdmissionOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
                >
                  Complete Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile & Document Upload Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  {selectedStudent.admissionNo} · Roll {selectedStudent.rollNo}
                </p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedStudent.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {classMap[selectedStudent.classId]
                    ? `${classMap[selectedStudent.classId].name} - Section ${selectedStudent.section}`
                    : selectedStudent.section}{' '}
                  · Admitted {selectedStudent.admissionDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => openEditStudentModal(selectedStudent)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Info
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6">
              <div className="space-y-1.5">
                <div className="text-slate-500">Personal Details</div>
                <div>Gender: <strong className="font-medium">{selectedStudent.gender}</strong></div>
                <div>DOB: <strong className="font-mono">{selectedStudent.dob}</strong></div>
                <div>Blood Group: <strong className="font-medium">{selectedStudent.bloodGroup}</strong></div>
                <div>Address: <strong className="font-medium">{selectedStudent.address}</strong></div>
              </div>
              <div className="space-y-1.5">
                <div className="text-slate-500">Guardian Information</div>
                <div>Name: <strong className="font-medium">{selectedStudent.guardianName}</strong> ({selectedStudent.guardianRelation})</div>
                <div>Phone: <strong className="font-mono">{selectedStudent.guardianPhone}</strong></div>
                <div>Email: <strong className="font-mono">{selectedStudent.guardianEmail}</strong></div>
                <div>CNIC: <strong className="font-mono">{selectedStudent.guardianCnic}</strong></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">
                Verified Student Documents ({selectedStudent.documents.length})
              </h3>
              {selectedStudent.documents.length === 0 ? (
                <p className="text-xs text-slate-500 mb-4">No documents uploaded yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 mb-4 text-xs">
                  {selectedStudent.documents.map((doc) => (
                    <div key={doc.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {doc.title}
                        </span>{' '}
                        <span className="text-slate-500 font-mono">({doc.fileName})</span>
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                        Verified · {doc.uploadedAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <form
                  onSubmit={handleAddStudentDocument}
                  className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2"
                >
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Document Title
                    </label>
                    <input
                      required
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g. Medical Fitness Certificate"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Select File
                    </label>
                    <input
                      type="file"
                      onChange={(e) =>
                        setNewDocFile(e.target.files?.[0]?.name || '')
                      }
                      className="w-full text-xs text-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Attach
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Information Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Edit Student Information
                </h2>
                <p className="text-xs text-slate-500">
                  Update personal profile, roll number, class assignment, scholarship, and guardian details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditStudentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Full Name *</label>
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Class & Section *</label>
                  <select
                    required
                    value={editForm.classId}
                    onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - Section {c.section} (Room {c.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Roll No (MM-YYYY-NNN) *</label>
                  <input
                    required
                    value={editForm.rollNo}
                    onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Admission No *</label>
                  <input
                    required
                    value={editForm.admissionNo}
                    onChange={(e) => setEditForm({ ...editForm, admissionNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Admission Date</label>
                  <input
                    type="date"
                    value={editForm.admissionDate}
                    onChange={(e) => setEditForm({ ...editForm, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gender: e.target.value as 'Male' | 'Female' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Merit Scholarship (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.scholarshipPercent}
                    onChange={(e) =>
                      setEditForm({ ...editForm, scholarshipPercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Enrollment Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as StudentStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PROMOTED">PROMOTED</option>
                    <option value="TRANSFERRED">TRANSFERRED</option>
                    <option value="ALUMNI">ALUMNI</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Reset LMS Portal Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.portalPassword}
                    onChange={(e) =>
                      setEditForm({ ...editForm, portalPassword: e.target.value })
                    }
                    placeholder="Leave blank to keep (default Student@123)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Guardian Name *</label>
                  <input
                    required
                    value={editForm.guardianName}
                    onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Relation</label>
                  <select
                    value={editForm.guardianRelation}
                    onChange={(e) =>
                      setEditForm({ ...editForm, guardianRelation: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian Phone *</label>
                  <input
                    required
                    value={editForm.guardianPhone}
                    onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian Email</label>
                  <input
                    type="email"
                    value={editForm.guardianEmail}
                    onChange={(e) => setEditForm({ ...editForm, guardianEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian CNIC</label>
                  <input
                    value={editForm.guardianCnic}
                    onChange={(e) => setEditForm({ ...editForm, guardianCnic: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Residential Address</label>
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
                >
                  Save Student Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promote / Transfer Class Modal */}
      {promoteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Promote or Reassign Class
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: {promoteStudent.name} ({promoteStudent.admissionNo})
            </p>
            <form onSubmit={handlePromote} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Destination Class & Section</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - Section {c.section}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Updated Roll Number (MM-YYYY-NNN)</label>
                <input
                  value={newRollNo}
                  onChange={(e) => setNewRollNo(e.target.value)}
                  placeholder="e.g. 10-2026-001"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromoteStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
                >
                  Confirm Promotion <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaving Certificate Generation Modal */}
      {certModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Issue Leaving / Transfer Certificate
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Generates an official printable School Leaving Certificate (SLC) for {certModalStudent.name}.
            </p>
            <form onSubmit={handleIssueCertificate} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Certificate Type</label>
                <select
                  value={leavingType}
                  onChange={(e) => setLeavingType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="TRANSFER">School Transfer</option>
                  <option value="GRADUATION">Matriculation / Graduation</option>
                  <option value="WITHDRAWAL">Parent Withdrawal</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Reason for Leaving</label>
                <input
                  required
                  value={leavingReason}
                  onChange={(e) => setLeavingReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Character & Conduct</label>
                <select
                  value={leavingConduct}
                  onChange={(e) => setLeavingConduct(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Exemplary">Exemplary</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Satisfactory">Satisfactory</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCertModalStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
                >
                  Issue & Preview SLC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Leaving Certificate Preview */}
      <PrintPreviewModal
        open={Boolean(printCertStudent?.leavingCertificate)}
        onClose={() => setPrintCertStudent(null)}
        title="School Leaving & Transfer Certificate"
        documentSubtitle="Office of the Registrar · Leaving & Transfer Record"
      >
        {printCertStudent?.leavingCertificate && (
          <div className="space-y-6 text-sm leading-relaxed">
            <div className="flex justify-between text-xs font-mono border-b border-slate-200 pb-3">
              <span>Certificate No: {printCertStudent.leavingCertificate.certificateNo}</span>
              <span>Admission No: {printCertStudent.admissionNo}</span>
            </div>

            <h3 className="text-center text-base font-bold uppercase tracking-wide text-slate-900">
              School Leaving Certificate
            </h3>

            <p className="text-slate-700">
              This is to certify that <strong>{printCertStudent.name}</strong>, child/ward of{' '}
              <strong>{printCertStudent.guardianName}</strong>, bearing Roll No{' '}
              <strong className="font-mono">{printCertStudent.rollNo}</strong> and Date of Birth{' '}
              <strong className="font-mono">{printCertStudent.dob}</strong>, was enrolled at
              GBPS: Kando Lund on{' '}
              <strong className="font-mono">{printCertStudent.admissionDate}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-lg p-4">
              <div>
                <span className="text-slate-500">Last Class Attended:</span>{' '}
                <strong>{printCertStudent.leavingCertificate.lastClassAttended}</strong>
              </div>
              <div>
                <span className="text-slate-500">Separation Type:</span>{' '}
                <strong>{printCertStudent.leavingCertificate.leavingType}</strong>
              </div>
              <div>
                <span className="text-slate-500">Conduct & Character:</span>{' '}
                <strong>{printCertStudent.leavingCertificate.conduct}</strong>
              </div>
              <div>
                <span className="text-slate-500">Date of Issue:</span>{' '}
                <strong className="font-mono">{printCertStudent.leavingCertificate.issueDate}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Reason for Leaving:</span>{' '}
                <strong>{printCertStudent.leavingCertificate.reason}</strong>
              </div>
            </div>
          </div>
        )}
      </PrintPreviewModal>
    </div>
  );
}
