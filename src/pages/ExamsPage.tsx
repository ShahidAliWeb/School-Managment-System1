import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Check, Download, Plus } from 'lucide-react';
import {
  Exam,
  ExamMark,
  SchoolClass,
  Student,
  Subject,
  UserRole,
} from '../types/index.ts';
import { apiRequest, exportToExcelCsv } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { PrintPreviewModal } from '../components/ui/PrintPreviewModal.tsx';

type ExamTab = 'results' | 'marks' | 'datesheet';

interface StandingRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
  position: number;
  subjectBreakdown: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    marksObtained: number;
    maxMarks: number;
    grade: string;
    remarks: string;
  }[];
}

export function ExamsPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const canEditMarks = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);
  const canCreateExam = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);

  const [tab, setTab] = useState<ExamTab>('results');
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [standingsMap, setStandingsMap] = useState<Record<string, StandingRow[]>>({});
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedExamId, setSelectedExamId] = useState('exm-mid26');
  const [selectedClassId, setSelectedClassId] = useState('cls-10a');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [reportCardRow, setReportCardRow] = useState<StandingRow | null>(null);

  // Marks entry drafts
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});
  const [draftRemarks, setDraftRemarks] = useState<Record<string, string>>({});

  // New exam form
  const [examForm, setExamForm] = useState({
    name: '',
    term: 'Spring Term',
    academicYear: '2026-2027',
    startDate: '2027-03-10',
    endDate: '2027-03-22',
  });

  const loadExams = () => {
    Promise.all([
      apiRequest<{
        exams: Exam[];
        examMarks: ExamMark[];
        standingsByExamClass: Record<string, StandingRow[]>;
      }>('/exams'),
      apiRequest<{ students: Student[]; classes: SchoolClass[] }>('/students'),
      apiRequest<{ subjects: Subject[] }>('/bootstrap'),
    ])
      .then(([exRes, stRes, bootRes]) => {
        setExams(exRes.exams);
        setMarks(exRes.examMarks);
        setStandingsMap(exRes.standingsByExamClass);
        setStudents(stRes.students);
        setClasses(stRes.classes);
        setSubjects(bootRes.subjects);
        if (exRes.exams[0] && !selectedExamId) setSelectedExamId(exRes.exams[0].id);
        if (stRes.classes[0] && !selectedClassId) setSelectedClassId(stRes.classes[0].id);
      })
      .catch((err) => notify(err.message, 'error'));
  };

  useEffect(() => {
    loadExams();
  }, []);

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.classId === selectedClassId),
    [subjects, selectedClassId]
  );

  useEffect(() => {
    if (classSubjects[0]) {
      setSelectedSubjectId(classSubjects[0].id);
    }
  }, [classSubjects]);

  const classStudents = useMemo(
    () => students.filter((s) => s.classId === selectedClassId && s.status === 'ACTIVE'),
    [students, selectedClassId]
  );

  useEffect(() => {
    const sc: Record<string, number> = {};
    const rm: Record<string, string> = {};
    classStudents.forEach((st) => {
      const ex = marks.find(
        (m) =>
          m.examId === selectedExamId &&
          m.subjectId === selectedSubjectId &&
          m.studentId === st.id
      );
      sc[st.id] = ex?.marksObtained ?? 0;
      rm[st.id] = ex?.remarks ?? '';
    });
    setDraftScores(sc);
    setDraftRemarks(rm);
  }, [classStudents, marks, selectedExamId, selectedSubjectId]);

  const currentStandings = standingsMap[`${selectedExamId}::${selectedClassId}`] || [];
  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const handleSaveMarks = async () => {
    try {
      const entries = classStudents.map((st) => ({
        studentId: st.id,
        marksObtained: Number(draftScores[st.id] ?? 0),
        maxMarks: 100,
        remarks: draftRemarks[st.id] || '',
      }));
      await apiRequest('/exams/marks', {
        method: 'POST',
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: selectedSubjectId,
          entries,
        }),
      });
      loadExams();
      notify('Subject marks saved and class positions recalculated.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ exam: Exam }>('/exams', {
        method: 'POST',
        body: JSON.stringify(examForm),
      });
      setExams((prev) => [res.exam, ...prev]);
      setExamForm((p) => ({ ...p, name: '' }));
      notify(`Scheduled "${res.exam.name}".`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportStandings = () => {
    exportToExcelCsv(
      `exam_results_${selectedExamId}_${selectedClassId}.csv`,
      ['Class Rank', 'Roll No', 'Student Name', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade', 'GPA'],
      currentStandings.map((r) => [
        `#${r.position}`,
        r.rollNo,
        r.studentName,
        r.totalObtained,
        r.totalMax,
        `${r.percentage}%`,
        r.grade,
        r.gpa,
      ])
    );
  };

  const formatOrdinal = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Examinations, Grading & Transcripts
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Exam datesheets, teacher marks entry, automated percentage/grade/position calculation, and report cards.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTab('results')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'results'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Results & Report Cards
          </button>
          {canEditMarks && (
            <button
              type="button"
              onClick={() => setTab('marks')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'marks'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Marks Entry
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('datesheet')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'datesheet'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Datesheet & Schedule
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Examination</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.status})
                </option>
              ))}
            </select>
          </div>

          {tab !== 'datesheet' && (
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

          {tab === 'marks' && (
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {classSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {tab === 'results' && currentStandings.length > 0 && (
          <button
            type="button"
            onClick={handleExportStandings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export Broadsheet (Excel)
          </button>
        )}

        {tab === 'marks' && canEditMarks && (
          <button
            type="button"
            onClick={handleSaveMarks}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            Save Marks & Compute Ranks
          </button>
        )}
      </div>

      {/* TAB 1: RESULTS & REPORT CARDS */}
      {tab === 'results' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-right">Total Marks</th>
                  <th className="py-3 px-4 text-right">Percentage</th>
                  <th className="py-3 px-4">Grade / GPA</th>
                  <th className="py-3 px-4 text-right">Transcript</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {currentStandings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No published marks found for this examination and class. Switch to Grade 10-A Midterm or enter marks.
                    </td>
                  </tr>
                ) : (
                  currentStandings.map((row) => (
                    <tr
                      key={row.studentId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {formatOrdinal(row.position)}
                      </td>
                      <td className="py-3 px-4 font-mono">{row.rollNo}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {row.studentName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {row.totalObtained} / {row.totalMax}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {row.percentage}%
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {row.grade}
                        </span>{' '}
                        <span className="text-slate-500">({row.gpa.toFixed(1)})</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setReportCardRow(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                        >
                          <Printer className="w-3 h-3" />
                          Report Card
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHER MARKS ENTRY */}
      {tab === 'marks' && canEditMarks && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Marks Obtained (Out of 100)</th>
                  <th className="py-3 px-4">Evaluator Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {classStudents.map((st) => (
                  <tr key={st.id}>
                    <td className="py-3 px-4 font-mono">{st.rollNo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {st.name}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftScores[st.id] ?? 0}
                        onChange={(e) =>
                          setDraftScores((prev) => ({
                            ...prev,
                            [st.id]: Number(e.target.value),
                          }))
                        }
                        className="w-28 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={draftRemarks[st.id] ?? ''}
                        onChange={(e) =>
                          setDraftRemarks((prev) => ({
                            ...prev,
                            [st.id]: e.target.value,
                          }))
                        }
                        placeholder="Teacher comment..."
                        className="w-full max-w-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EXAM SCHEDULE & DATESHEET */}
      {tab === 'datesheet' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedExam?.name || 'Examination Datesheet'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedExam?.startDate} to {selectedExam?.endDate} · {selectedExam?.academicYear}
                </p>
              </div>
            </div>

            {selectedExam && selectedExam.datesheet.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5">Exam Date</th>
                    <th className="py-2.5">Subject</th>
                    <th className="py-2.5">Start Time</th>
                    <th className="py-2.5">Duration</th>
                    <th className="py-2.5">Hall / Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedExam.datesheet.map((d, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-mono">{d.examDate}</td>
                      <td className="py-2.5 font-semibold">{d.subjectName}</td>
                      <td className="py-2.5 font-mono">{d.startTime}</td>
                      <td className="py-2.5 font-mono">{d.durationMins} mins</td>
                      <td className="py-2.5">{d.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500">No paper datesheet entries registered for this exam yet.</p>
            )}
          </div>

          {canCreateExam && (
            <form
              onSubmit={handleCreateExam}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Schedule New Examination Session
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  required
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder="Exam Title (e.g. Spring Finals 2027)"
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="date"
                  required
                  value={examForm.startDate}
                  onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
                <input
                  type="date"
                  required
                  value={examForm.endDate}
                  onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Examination
              </button>
            </form>
          )}
        </div>
      )}

      {/* Printable Official Report Card */}
      <PrintPreviewModal
        open={Boolean(reportCardRow)}
        onClose={() => setReportCardRow(null)}
        title="Official Academic Report Card & Transcript"
        documentSubtitle={`${selectedExam?.name || 'Examination'} · Academic Session ${selectedExam?.academicYear || '2026-2027'}`}
      >
        {reportCardRow && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                Student Name: <strong>{reportCardRow.studentName}</strong>
              </div>
              <div>
                Roll Number: <strong className="font-mono">{reportCardRow.rollNo}</strong>
              </div>
              <div>
                Class Position: <strong className="font-mono">{formatOrdinal(reportCardRow.position)}</strong>
              </div>
              <div>
                Cumulative GPA: <strong className="font-mono">{reportCardRow.gpa.toFixed(2)} ({reportCardRow.grade})</strong>
              </div>
            </div>

            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-2">Code</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2 text-right">Max</th>
                  <th className="py-2 text-right">Obtained</th>
                  <th className="py-2 text-center">Grade</th>
                  <th className="py-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportCardRow.subjectBreakdown.map((sub) => (
                  <tr key={sub.subjectId}>
                    <td className="py-2.5 font-mono">{sub.subjectCode}</td>
                    <td className="py-2.5 font-medium">{sub.subjectName}</td>
                    <td className="py-2.5 text-right font-mono">{sub.maxMarks}</td>
                    <td className="py-2.5 text-right font-mono font-semibold">{sub.marksObtained}</td>
                    <td className="py-2.5 text-center font-mono font-semibold">{sub.grade}</td>
                    <td className="py-2.5 text-slate-600">{sub.remarks}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td colSpan={2} className="py-3">
                    Aggregate Result
                  </td>
                  <td className="py-3 text-right font-mono">{reportCardRow.totalMax}</td>
                  <td className="py-3 text-right font-mono">{reportCardRow.totalObtained}</td>
                  <td className="py-3 text-center font-mono">{reportCardRow.percentage}%</td>
                  <td className="py-3">Grade {reportCardRow.grade}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </PrintPreviewModal>
    </div>
  );
}
