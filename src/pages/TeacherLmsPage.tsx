import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AttendanceStatus,
  Exam,
  ExamStanding,
  Homework,
  LmsLecture,
  LmsQuiz,
  SchoolClass,
  Student,
  StudentAttendance,
  Subject,
  UserRole,
} from '../types/index.ts';
import { apiRequest, exportToExcelCsv } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

type TeacherLmsTab = 'results' | 'attendance' | 'quizzes' | 'assignments' | 'lectures';

interface DraftQuestion {
  questionText: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  marks: number;
}

export function TeacherLmsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const [tab, setTab] = useState<TeacherLmsTab>('results');
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lectures, setLectures] = useState<LmsLecture[]>([]);
  const [assignments, setAssignments] = useState<Homework[]>([]);
  const [quizzes, setQuizzes] = useState<LmsQuiz[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [standings, setStandings] = useState<Record<string, ExamStanding[]>>({});

  const [selectedClassId, setSelectedClassId] = useState<string>('cls-10a');

  // Inline Teacher Attendance Updater state
  const [attDate, setAttDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [draftStatus, setDraftStatus] = useState<Record<string, AttendanceStatus>>({});
  const [draftRemarks, setDraftRemarks] = useState<Record<string, string>>({});
  const [savingAtt, setSavingAtt] = useState(false);

  // Assignment Grading state
  const [gradeMarks, setGradeMarks] = useState<Record<string, number>>({});
  const [gradeFeedback, setGradeFeedback] = useState<Record<string, string>>({});

  // Quiz Attempt Teacher Remarks state
  const [attemptRemarks, setAttemptRemarks] = useState<Record<string, string>>({});

  // New Lecture Form
  const [lecForm, setLecForm] = useState({
    subjectId: '',
    title: '',
    topic: '',
    durationMins: 40,
    videoUrl: '',
    notes: '',
  });

  // New Assignment Form
  const [hwForm, setHwForm] = useState({
    subjectId: '',
    title: '',
    description: '',
    dueDate: '2026-11-05',
    maxMarks: 20,
    attachmentName: '',
  });

  // New MCQ Quiz Builder Form
  const [quizForm, setQuizForm] = useState({
    subjectId: '',
    title: '',
    instructions: 'Select the best option for each multiple-choice question.',
    durationMins: 15,
    dueDate: '2026-11-05',
  });
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    {
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      marks: 5,
    },
  ]);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiRequest<{
        classes: SchoolClass[];
        subjects: Subject[];
        students: Student[];
        lectures: LmsLecture[];
        assignments: Homework[];
        quizzes: LmsQuiz[];
        attendance: StudentAttendance[];
      }>('/lms'),
      apiRequest<{ exams: Exam[]; standingsByExamClass: Record<string, any[]> }>('/exams'),
    ])
      .then(([lmsRes, exRes]) => {
        setClasses(lmsRes.classes);
        setSubjects(lmsRes.subjects);
        setStudents(lmsRes.students);
        setLectures(lmsRes.lectures);
        setAssignments(lmsRes.assignments);
        setQuizzes(lmsRes.quizzes);
        setAttendance(lmsRes.attendance);
        setExams(exRes.exams);
        setStandings(exRes.standingsByExamClass);
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.classId === selectedClassId),
    [subjects, selectedClassId]
  );

  // Sync default subjectId when class changes
  useEffect(() => {
    const firstSub = classSubjects[0]?.id || '';
    setLecForm((p) => ({ ...p, subjectId: firstSub }));
    setHwForm((p) => ({ ...p, subjectId: firstSub }));
    setQuizForm((p) => ({ ...p, subjectId: firstSub }));
  }, [selectedClassId, classSubjects.length]);

  const classStudents = useMemo(
    () =>
      students.filter(
        (s) => s.classId === selectedClassId && s.status === 'ACTIVE'
      ),
    [students, selectedClassId]
  );

  const classLectures = useMemo(
    () => lectures.filter((l) => l.classId === selectedClassId),
    [lectures, selectedClassId]
  );

  const classAssignments = useMemo(
    () => assignments.filter((a) => a.classId === selectedClassId),
    [assignments, selectedClassId]
  );

  const classQuizzes = useMemo(
    () => quizzes.filter((q) => q.classId === selectedClassId),
    [quizzes, selectedClassId]
  );

  // Sync draft attendance when class or date changes
  useEffect(() => {
    const statusMap: Record<string, AttendanceStatus> = {};
    const remarksMap: Record<string, string> = {};
    classStudents.forEach((st) => {
      const existing = attendance.find(
        (a) => a.studentId === st.id && a.date === attDate
      );
      statusMap[st.id] = existing?.status || 'PRESENT';
      remarksMap[st.id] = existing?.remarks || '';
    });
    setDraftStatus(statusMap);
    setDraftRemarks(remarksMap);
  }, [classStudents, attendance, attDate]);

  const subjectName = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.name || 'General';

  // Compute Unified Student Gradebook for selected class
  const classGradebook = useMemo(() => {
    const latestExam = exams[0];
    const examRows = latestExam ? standings[`${latestExam.id}::${selectedClassId}`] || [] : [];

    return classStudents.map((st) => {
      // Attendance %
      const stAtt = attendance.filter((a) => a.studentId === st.id);
      const presentCount = stAtt.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attPct =
        stAtt.length > 0 ? Number(((presentCount / stAtt.length) * 100).toFixed(1)) : 100;

      // Quiz Avg %
      const attempts = classQuizzes
        .map((q) => q.attempts.find((a) => a.studentId === st.id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
      const quizObtained = attempts.reduce((s, a) => s + a.score, 0);
      const quizTotal = attempts.reduce((s, a) => s + a.totalMarks, 0);
      const quizSummary =
        attempts.length > 0
          ? `${quizObtained}/${quizTotal} (${((quizObtained / Math.max(1, quizTotal)) * 100).toFixed(0)}%)`
          : 'No Attempts';

      // Assignments Graded
      const subs = classAssignments
        .map((hw) => {
          const found = hw.submissions.find((s) => s.studentId === st.id);
          return found ? { sub: found, maxMarks: hw.maxMarks || 20 } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const gradedSubs = subs.filter((x) => x.sub.status === 'GRADED');
      const hwObtained = gradedSubs.reduce((s, x) => s + (x.sub.marks || 0), 0);
      const hwTotal = gradedSubs.reduce((s, x) => s + x.maxMarks, 0);
      const assignmentSummary =
        gradedSubs.length > 0
          ? `${hwObtained}/${hwTotal} (${subs.length} submitted)`
          : subs.length > 0
          ? `${subs.length} Pending Grade`
          : '0 Submitted';

      // Term Exam %
      const exRow = examRows.find((r: ExamStanding) => r.studentId === st.id);
      const examSummary = exRow ? `${exRow.percentage}% (${exRow.grade})` : '—';

      return {
        student: st,
        attPct,
        quizSummary,
        assignmentSummary,
        examSummary,
      };
    });
  }, [classStudents, attendance, classQuizzes, classAssignments, exams, standings, selectedClassId]);

  const handleSaveAttendance = async () => {
    if (classStudents.length === 0) {
      notify('No active students in the selected class.', 'error');
      return;
    }
    setSavingAtt(true);
    try {
      const records = classStudents.map((st) => ({
        studentId: st.id,
        status: draftStatus[st.id] || 'PRESENT',
        remarks: draftRemarks[st.id] || '',
      }));
      const res = await apiRequest<{
        studentAttendance: StudentAttendance[];
        notificationsDispatched: number;
      }>('/attendance/students', {
        method: 'POST',
        body: JSON.stringify({
          date: attDate,
          classId: selectedClassId,
          autoNotifyParents: true,
          records,
        }),
      });
      setAttendance(res.studentAttendance);
      notify(
        `Attendance updated for ${attDate} (${records.length} students).`,
        'success'
      );
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSavingAtt(false);
    }
  };

  const handleGradeSubmission = async (hw: Homework, studentId: string) => {
    const key = `${hw.id}::${studentId}`;
    const existingSub = hw.submissions.find((s) => s.studentId === studentId);
    const marks = gradeMarks[key] ?? existingSub?.marks ?? 0;
    const feedback = gradeFeedback[key] ?? existingSub?.feedback ?? '';

    try {
      const res = await apiRequest<{ assignment: Homework }>(
        `/lms/assignments/${hw.id}/grade`,
        {
          method: 'PUT',
          body: JSON.stringify({ studentId, marks, feedback }),
        }
      );
      setAssignments((prev) =>
        prev.map((a) => (a.id === hw.id ? res.assignment : a))
      );
      notify('Assignment grade and feedback saved.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSaveQuizRemarks = async (quizId: string, attemptId: string, fallback: string) => {
    const remarks = attemptRemarks[attemptId] ?? fallback;
    try {
      const res = await apiRequest<{ quiz: LmsQuiz }>(
        `/lms/quizzes/${quizId}/attempts/${attemptId}/remarks`,
        {
          method: 'PUT',
          body: JSON.stringify({ teacherRemarks: remarks }),
        }
      );
      setQuizzes((prev) => prev.map((q) => (q.id === quizId ? res.quiz : q)));
      notify('Teacher remarks saved on quiz attempt.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecForm.subjectId) {
      notify('Please add/select a subject for this class first.', 'error');
      return;
    }
    try {
      const res = await apiRequest<{ lecture: LmsLecture }>('/lms/lectures', {
        method: 'POST',
        body: JSON.stringify({
          ...lecForm,
          classId: selectedClassId,
        }),
      });
      setLectures((prev) => [res.lecture, ...prev]);
      setLecForm((p) => ({ ...p, title: '', topic: '', videoUrl: '', notes: '' }));
      notify('Lecture published to Student Portal.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteLecture = async (id: string) => {
    try {
      await apiRequest(`/lms/lectures/${id}`, { method: 'DELETE' });
      setLectures((prev) => prev.filter((l) => l.id !== id));
      notify('Lecture removed.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwForm.subjectId) {
      notify('Please select a subject for this class.', 'error');
      return;
    }
    try {
      const res = await apiRequest<{ homework: Homework }>('/academics/homework', {
        method: 'POST',
        body: JSON.stringify({
          ...hwForm,
          classId: selectedClassId,
        }),
      });
      setAssignments((prev) => [res.homework, ...prev]);
      setHwForm((p) => ({ ...p, title: '', description: '', attachmentName: '' }));
      notify('Assignment published to Student Portal.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.subjectId) {
      notify('Please select a subject for this class.', 'error');
      return;
    }
    const validQuestions = draftQuestions.filter(
      (q) => q.questionText.trim() && q.options.every((o) => o.trim())
    );
    if (validQuestions.length === 0) {
      notify('Please complete at least 1 question with all 4 options.', 'error');
      return;
    }

    try {
      const res = await apiRequest<{ quiz: LmsQuiz }>('/lms/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          ...quizForm,
          classId: selectedClassId,
          questions: validQuestions,
        }),
      });
      setQuizzes((prev) => [res.quiz, ...prev]);
      setQuizForm((p) => ({ ...p, title: '' }));
      setDraftQuestions([
        { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, marks: 5 },
      ]);
      notify('Online MCQ Quiz published to Student Portal.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      await apiRequest(`/lms/quizzes/${id}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      notify('Quiz deleted.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportGradebook = () => {
    const cls = classes.find((c) => c.id === selectedClassId);
    exportToExcelCsv(
      `gbps_lms_results_${cls?.name || 'class'}.csv`,
      ['Student ID', 'Student Name', 'Attendance %', 'Quizzes', 'Assignments', 'Term Exam'],
      classGradebook.map((row) => [
        row.student.rollNo,
        row.student.name,
        `${row.attPct}%`,
        row.quizSummary,
        row.assignmentSummary,
        row.examSummary,
      ])
    );
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-500">
        Loading LMS Portal...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Class Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            {isSuperAdmin
              ? 'Super Admin Master LMS Control · All Classes & Teachers'
              : `Teacher LMS Portal · ${user?.name}`}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            LMS Gradebook, Attendance & Courseware
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Check student quiz and exam results, grade submitted assignments, update daily attendance, and publish lectures.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Active Class:
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — Section {c.section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Segmented Teacher LMS Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit max-w-full overflow-x-auto">
        {(
          [
            { key: 'results', label: 'Check Results & Grades' },
            { key: 'attendance', label: 'Update Attendance' },
            { key: 'quizzes', label: `Quizzes (${classQuizzes.length})` },
            { key: 'assignments', label: `Assignments (${classAssignments.length})` },
            { key: 'lectures', label: `Lectures (${classLectures.length})` },
          ] as { key: TeacherLmsTab; label: string }[]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === item.key
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CHECK STUDENT RESULTS & GRADE SUBMISSIONS */}
      {tab === 'results' && (
        <div className="space-y-6">
          {/* Unified Class LMS Result Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Class Student LMS Result Sheet</h2>
                <p className="text-xs text-slate-500">
                  Combined attendance, online quiz scores, graded assignments, and term examination standing
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportGradebook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Results CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-3 px-4">Student ID (Roll No)</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Quiz Score</th>
                    <th className="py-3 px-4">Assignments</th>
                    <th className="py-3 px-4">Term Exam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {classGradebook.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No active students enrolled in this class.
                      </td>
                    </tr>
                  ) : (
                    classGradebook.map((row) => (
                      <tr key={row.student.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {row.student.rollNo}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {row.student.name}
                        </td>
                        <td className="py-3 px-4 font-mono">{row.attPct}%</td>
                        <td className="py-3 px-4 font-mono">{row.quizSummary}</td>
                        <td className="py-3 px-4 font-mono">{row.assignmentSummary}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{row.examSummary}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Review Student Quiz Attempts */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Student Quiz Attempts & Remarks</h3>
                <p className="text-xs text-slate-500">
                  Auto-graded MCQ quiz submissions for this class
                </p>
              </div>

              {classQuizzes.every((q) => q.attempts.length === 0) ? (
                <p className="text-xs text-slate-500 py-4">
                  No student quiz submissions recorded for this class yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {classQuizzes.map((qz) =>
                    qz.attempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {att.studentName}{' '}
                              <span className="font-mono text-slate-500">({att.rollNo})</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{qz.title}</div>
                          </div>
                          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {att.score} / {att.totalMarks} ({att.percentage}%)
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={attemptRemarks[att.id] ?? att.teacherRemarks ?? ''}
                            onChange={(e) =>
                              setAttemptRemarks((p) => ({ ...p, [att.id]: e.target.value }))
                            }
                            placeholder="Add teacher feedback on quiz..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveQuizRemarks(qz.id, att.id, att.teacherRemarks || '')
                            }
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium shrink-0"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Grade Student Assignment Submissions */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Assignment Submissions Grading</h3>
                <p className="text-xs text-slate-500">
                  Evaluate submitted student work and publish marks
                </p>
              </div>

              {classAssignments.every((hw) => hw.submissions.length === 0) ? (
                <p className="text-xs text-slate-500 py-4">
                  No assignment submissions received for this class yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {classAssignments.map((hw) =>
                    hw.submissions.map((sub) => {
                      const key = `${hw.id}::${sub.studentId}`;
                      const maxMarks = hw.maxMarks || 20;
                      return (
                        <div
                          key={key}
                          className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {sub.studentName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {hw.title} · File: <span className="font-mono">{sub.attachmentName}</span>
                              </div>
                            </div>
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {sub.status === 'GRADED'
                                ? `${sub.marks}/${maxMarks}`
                                : 'Pending Grade'}
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                            {sub.notes}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              value={gradeMarks[key] ?? sub.marks ?? maxMarks}
                              onChange={(e) =>
                                setGradeMarks((p) => ({
                                  ...p,
                                  [key]: Number(e.target.value),
                                }))
                              }
                              className="sm:col-span-3 px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                              title={`Marks out of ${maxMarks}`}
                            />
                            <input
                              type="text"
                              value={gradeFeedback[key] ?? sub.feedback ?? ''}
                              onChange={(e) =>
                                setGradeFeedback((p) => ({ ...p, [key]: e.target.value }))
                              }
                              placeholder="Feedback for student..."
                              className="sm:col-span-6 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                            />
                            <button
                              type="button"
                              onClick={() => handleGradeSubmission(hw, sub.studentId)}
                              className="sm:col-span-3 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
                            >
                              Save Grade
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPDATE CLASS ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-sm font-semibold">Update Daily Student Attendance</h2>
                <p className="text-xs text-slate-500">
                  Changes sync immediately to each student’s portal attendance log
                </p>
              </div>
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <button
              type="button"
              disabled={savingAtt}
              onClick={handleSaveAttendance}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingAtt ? 'Saving...' : 'Update Attendance'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No active students in this class.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((st) => {
                    const current = draftStatus[st.id] || 'PRESENT';
                    return (
                      <tr key={st.id}>
                        <td className="py-3 px-4 font-mono font-semibold">{st.rollNo}</td>
                        <td className="py-3 px-4 font-semibold">{st.name}</td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            {(['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as AttendanceStatus[]).map(
                              (stOpt) => (
                                <button
                                  key={stOpt}
                                  type="button"
                                  onClick={() =>
                                    setDraftStatus((p) => ({ ...p, [st.id]: stOpt }))
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                    current === stOpt
                                      ? stOpt === 'PRESENT'
                                        ? 'bg-emerald-700 text-white'
                                        : stOpt === 'ABSENT'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-amber-600 text-white'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  {stOpt}
                                </button>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={draftRemarks[st.id] || ''}
                            onChange={(e) =>
                              setDraftRemarks((p) => ({ ...p, [st.id]: e.target.value }))
                            }
                            placeholder="Optional note..."
                            className="w-full max-w-xs px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
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

      {/* TAB 3: CREATE & MANAGE QUIZZES */}
      {tab === 'quizzes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateQuiz}
            className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4"
          >
            <h2 className="text-sm font-semibold">Publish New Online MCQ Quiz</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Subject</label>
                <select
                  required
                  value={quizForm.subjectId}
                  onChange={(e) => setQuizForm((p) => ({ ...p, subjectId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={quizForm.title}
                  onChange={(e) => setQuizForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Quiz 03: Laws of Motion"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={quizForm.durationMins}
                  onChange={(e) =>
                    setQuizForm((p) => ({ ...p, durationMins: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={quizForm.dueDate}
                  onChange={(e) => setQuizForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">MCQ Questions Builder</span>
                <button
                  type="button"
                  onClick={() =>
                    setDraftQuestions((prev) => [
                      ...prev,
                      {
                        questionText: '',
                        options: ['', '', '', ''],
                        correctOptionIndex: 0,
                        marks: 5,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>

              {draftQuestions.map((dq, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Question #{qIdx + 1}</span>
                    {draftQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraftQuestions((prev) => prev.filter((_, i) => i !== qIdx))
                        }
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={dq.questionText}
                    onChange={(e) =>
                      setDraftQuestions((prev) =>
                        prev.map((item, i) =>
                          i === qIdx ? { ...item, questionText: e.target.value } : item
                        )
                      )
                    }
                    placeholder="Enter question prompt..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dq.options.map((opt, optIdx) => (
                      <input
                        key={optIdx}
                        type="text"
                        required
                        value={opt}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item, i) => {
                              if (i !== qIdx) return item;
                              const nextOpts = [...item.options] as [
                                string,
                                string,
                                string,
                                string
                              ];
                              nextOpts[optIdx] = e.target.value;
                              return { ...item, options: nextOpts };
                            })
                          )
                        }
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Correct Option
                      </label>
                      <select
                        value={dq.correctOptionIndex}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx
                                ? { ...item, correctOptionIndex: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value={0}>Option A</option>
                        <option value={1}>Option B</option>
                        <option value={2}>Option C</option>
                        <option value={3}>Option D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Marks</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={dq.marks}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx ? { ...item, marks: Number(e.target.value) } : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium"
            >
              Publish Quiz to Students
            </button>
          </form>

          <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-semibold">Published Class Quizzes</h2>
            {classQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No quizzes created for this class yet.</p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {classQuizzes.map((qz) => (
                  <div key={qz.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {qz.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {subjectName(qz.subjectId)} · {qz.questions.length} MCQs · {qz.totalMarks} Marks ·{' '}
                        {qz.attempts.length} Attempts
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuiz(qz.id)}
                      aria-label="Delete quiz"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PUBLISH & MANAGE ASSIGNMENTS */}
      {tab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateAssignment}
            className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs"
          >
            <h2 className="text-sm font-semibold">Post New Class Assignment</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Subject</label>
                <select
                  required
                  value={hwForm.subjectId}
                  onChange={(e) => setHwForm((p) => ({ ...p, subjectId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Max Marks</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={hwForm.maxMarks}
                  onChange={(e) =>
                    setHwForm((p) => ({ ...p, maxMarks: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Assignment Title</label>
              <input
                type="text"
                required
                value={hwForm.title}
                onChange={(e) => setHwForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Lab Worksheet: Ohm's Law & Circuit Analysis"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Instructions & Rubric</label>
              <textarea
                rows={4}
                required
                value={hwForm.description}
                onChange={(e) => setHwForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe tasks, questions, and grading expectations..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={hwForm.dueDate}
                  onChange={(e) => setHwForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Reference Worksheet Filename</label>
                <input
                  type="text"
                  value={hwForm.attachmentName}
                  onChange={(e) =>
                    setHwForm((p) => ({ ...p, attachmentName: e.target.value }))
                  }
                  placeholder="worksheet_unit3.pdf"
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
            >
              Publish Assignment
            </button>
          </form>

          <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-semibold">Active Assignments ({classAssignments.length})</h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {classAssignments.map((hw) => (
                <div key={hw.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {hw.title}
                    </span>
                    <span className="font-mono text-slate-500">
                      {hw.submissions.length} / {classStudents.length} Submitted
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{hw.description}</p>
                  <div className="text-[11px] text-slate-500">
                    {subjectName(hw.subjectId)} · Max {hw.maxMarks || 20} Marks · Due {hw.dueDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: UPLOAD & MANAGE LECTURES */}
      {tab === 'lectures' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateLecture}
            className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs"
          >
            <h2 className="text-sm font-semibold">Upload New Course Lecture</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Subject</label>
                <select
                  required
                  value={lecForm.subjectId}
                  onChange={(e) => setLecForm((p) => ({ ...p, subjectId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Unit / Topic</label>
                <input
                  type="text"
                  required
                  value={lecForm.topic}
                  onChange={(e) => setLecForm((p) => ({ ...p, topic: e.target.value }))}
                  placeholder="Unit 4 · Differential Calculus"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Lecture Title</label>
              <input
                type="text"
                required
                value={lecForm.title}
                onChange={(e) => setLecForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Lecture 04: Chain Rule & Stationary Points"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={lecForm.durationMins}
                  onChange={(e) =>
                    setLecForm((p) => ({ ...p, durationMins: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Video / Resource URL (Optional)</label>
                <input
                  type="url"
                  value={lecForm.videoUrl}
                  onChange={(e) => setLecForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Detailed Lecture Notes</label>
              <textarea
                rows={5}
                required
                value={lecForm.notes}
                onChange={(e) => setLecForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Write structured lecture summary, formulas, and key points..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
            >
              Publish Lecture
            </button>
          </form>

          <div className="lg:col-span-6 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-semibold">Published Class Lectures ({classLectures.length})</h2>
            {classLectures.length === 0 ? (
              <p className="text-xs text-slate-500">No lectures uploaded for this class yet.</p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {classLectures.map((lec) => (
                  <div
                    key={lec.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {lec.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {subjectName(lec.subjectId)} · {lec.topic} · {lec.durationMins} mins ·{' '}
                        {lec.completedStudentIds.length} students completed
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLecture(lec.id)}
                      aria-label="Delete lecture"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
