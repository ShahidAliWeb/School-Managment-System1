import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  PlayCircle,
  Send,
} from 'lucide-react';
import {
  Exam,
  ExamStanding,
  Homework,
  LmsLecture,
  LmsQuiz,
  LmsQuizAttempt,
  Notice,
  SchoolClass,
  Student,
  StudentAttendance,
  Subject,
  SubjectMarkBreakdown,
  UserRole,
} from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

type StudentPortalTab = 'overview' | 'quizzes' | 'assignments' | 'lectures' | 'attendance';

interface LmsPayload {
  students: Student[];
  classes: SchoolClass[];
  subjects: Subject[];
  lectures: LmsLecture[];
  assignments: Homework[];
  quizzes: LmsQuiz[];
  attendance: StudentAttendance[];
  notices: Notice[];
}

export function PortalPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const [tab, setTab] = useState<StudentPortalTab>('overview');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lectures, setLectures] = useState<LmsLecture[]>([]);
  const [assignments, setAssignments] = useState<Homework[]>([]);
  const [quizzes, setQuizzes] = useState<LmsQuiz[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [standings, setStandings] = useState<Record<string, ExamStanding[]>>({});

  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  // Active Quiz Runner state
  const [takingQuiz, setTakingQuiz] = useState<LmsQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [reviewQuizId, setReviewQuizId] = useState<string | null>(null);

  // Assignment submission form map
  const [assignmentNotes, setAssignmentNotes] = useState<Record<string, string>>({});
  const [assignmentFiles, setAssignmentFiles] = useState<Record<string, string>>({});
  const [submittingHwId, setSubmittingHwId] = useState<string | null>(null);

  // Expanded lecture reader
  const [openLectureId, setOpenLectureId] = useState<string | null>(null);

  const loadPortalData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<LmsPayload>('/lms'),
      apiRequest<{ exams: Exam[]; standingsByExamClass: Record<string, any[]> }>('/exams'),
    ])
      .then(([lmsRes, exRes]) => {
        setStudents(lmsRes.students);
        setClasses(lmsRes.classes);
        setSubjects(lmsRes.subjects);
        setLectures(lmsRes.lectures);
        setAssignments(lmsRes.assignments);
        setQuizzes(lmsRes.quizzes);
        setAttendance(lmsRes.attendance);
        setNotices(lmsRes.notices);
        setExams(exRes.exams);
        setStandings(exRes.standingsByExamClass);
        if (lmsRes.students[0] && !activeStudentId) {
          setActiveStudentId(lmsRes.students[0].id);
        }
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Countdown timer when taking an online quiz
  useEffect(() => {
    if (!takingQuiz || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [takingQuiz, secondsLeft]);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === activeStudentId) || students[0],
    [students, activeStudentId]
  );

  const studentClass = useMemo(
    () => classes.find((c) => c.id === activeStudent?.classId),
    [classes, activeStudent]
  );

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.classId === activeStudent?.classId),
    [subjects, activeStudent]
  );

  const studentLectures = useMemo(
    () =>
      lectures.filter(
        (l) =>
          l.classId === activeStudent?.classId &&
          (subjectFilter === 'ALL' || l.subjectId === subjectFilter)
      ),
    [lectures, activeStudent, subjectFilter]
  );

  const studentAssignments = useMemo(
    () => assignments.filter((a) => a.classId === activeStudent?.classId),
    [assignments, activeStudent]
  );

  const studentQuizzes = useMemo(
    () => quizzes.filter((q) => q.classId === activeStudent?.classId),
    [quizzes, activeStudent]
  );

  const studentAtt = useMemo(
    () =>
      attendance
        .filter((a) => a.studentId === activeStudent?.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [attendance, activeStudent]
  );

  const attStats = useMemo(() => {
    const present = studentAtt.filter((a) => a.status === 'PRESENT').length;
    const late = studentAtt.filter((a) => a.status === 'LATE').length;
    const absent = studentAtt.filter((a) => a.status === 'ABSENT').length;
    const leave = studentAtt.filter((a) => a.status === 'LEAVE').length;
    const total = studentAtt.length;
    const rate = total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 100;
    return { present, late, absent, leave, total, rate };
  }, [studentAtt]);

  const completedLecturesCount = useMemo(() => {
    if (!activeStudent) return 0;
    return lectures.filter(
      (l) =>
        l.classId === activeStudent.classId &&
        l.completedStudentIds.includes(activeStudent.id)
    ).length;
  }, [lectures, activeStudent]);

  const totalClassLecturesCount = useMemo(
    () => lectures.filter((l) => l.classId === activeStudent?.classId).length,
    [lectures, activeStudent]
  );

  const submittedAssignmentsCount = useMemo(() => {
    if (!activeStudent) return 0;
    return studentAssignments.filter((a) =>
      a.submissions.some((s) => s.studentId === activeStudent.id)
    ).length;
  }, [studentAssignments, activeStudent]);

  const myQuizAttempts = useMemo(() => {
    if (!activeStudent) return [];
    return studentQuizzes
      .map((q) => {
        const att = q.attempts.find((a) => a.studentId === activeStudent.id);
        return att ? { quiz: q, attempt: att } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [studentQuizzes, activeStudent]);

  const quizAvgPercent = useMemo(() => {
    if (myQuizAttempts.length === 0) return null;
    const sum = myQuizAttempts.reduce((s, item) => s + item.attempt.percentage, 0);
    return Number((sum / myQuizAttempts.length).toFixed(1));
  }, [myQuizAttempts]);

  const latestExamStanding = useMemo(() => {
    if (!activeStudent) return null;
    for (const ex of exams) {
      const rows = standings[`${ex.id}::${activeStudent.classId}`] || [];
      const match = rows.find((r) => r.studentId === activeStudent.id);
      if (match) return { exam: ex, row: match };
    }
    return null;
  }, [activeStudent, exams, standings]);

  const subjectName = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.name || 'General Subject';

  const startQuizRunner = (quiz: LmsQuiz) => {
    setTakingQuiz(quiz);
    setQuizAnswers(new Array(quiz.questions.length).fill(-1));
    setSecondsLeft(quiz.durationMins * 60);
  };

  const handleSubmitQuiz = async () => {
    if (!takingQuiz || !activeStudent) return;
    setSubmittingQuiz(true);
    try {
      const res = await apiRequest<{ attempt: LmsQuizAttempt; quiz: LmsQuiz }>(
        `/lms/quizzes/${takingQuiz.id}/attempt`,
        {
          method: 'POST',
          body: JSON.stringify({
            studentId: activeStudent.id,
            answers: quizAnswers,
          }),
        }
      );
      setQuizzes((prev) => prev.map((q) => (q.id === res.quiz.id ? res.quiz : q)));
      setReviewQuizId(res.quiz.id);
      setTakingQuiz(null);
      notify(
        `Quiz submitted! Score: ${res.attempt.score}/${res.attempt.totalMarks} (${res.attempt.percentage}%).`,
        'success'
      );
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleToggleLectureComplete = async (lectureId: string) => {
    if (!activeStudent) return;
    try {
      const res = await apiRequest<{ lecture: LmsLecture }>(
        `/lms/lectures/${lectureId}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({ studentId: activeStudent.id }),
        }
      );
      setLectures((prev) => prev.map((l) => (l.id === lectureId ? res.lecture : l)));
      const done = res.lecture.completedStudentIds.includes(activeStudent.id);
      notify(done ? 'Lecture marked as completed.' : 'Lecture marked as unread.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent, hw: Homework) => {
    e.preventDefault();
    if (!activeStudent) return;
    const notes = (assignmentNotes[hw.id] || '').trim();
    const attachmentName =
      (assignmentFiles[hw.id] || '').trim() || `${activeStudent.rollNo}_${hw.id}.pdf`;

    if (!notes) {
      notify('Please write your assignment response or work summary before submitting.', 'error');
      return;
    }

    setSubmittingHwId(hw.id);
    try {
      const res = await apiRequest<{ homework: Homework }>(
        `/academics/homework/${hw.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            studentId: activeStudent.id,
            notes,
            attachmentName,
          }),
        }
      );
      setAssignments((prev) =>
        prev.map((item) => (item.id === hw.id ? res.homework : item))
      );
      notify('Assignment submitted to your teacher.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmittingHwId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-500">
        Loading Student LMS Portal...
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-500">
        No student profile linked to this account.
      </div>
    );
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Student Identity Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Student LMS Portal · Limited Student Access
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            {activeStudent.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Student ID: {activeStudent.rollNo}</span>
            <span aria-hidden="true">·</span>
            <span>{activeStudent.admissionNo}</span>
            <span aria-hidden="true">·</span>
            <span className="font-sans">
              {studentClass
                ? `${studentClass.name} (Section ${studentClass.section})`
                : `Section ${activeStudent.section}`}
            </span>
          </div>
        </div>

        {/* Super Admin Student Switcher Preview */}
        {isSuperAdmin && students.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Preview Student:
            </label>
            <select
              value={activeStudent.id}
              onChange={(e) => {
                setActiveStudentId(e.target.value);
                setTakingQuiz(null);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.rollNo} — {st.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit max-w-full overflow-x-auto">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'quizzes', label: `Quizzes (${studentQuizzes.length})` },
            { key: 'assignments', label: `Assignments (${studentAssignments.length})` },
            { key: 'lectures', label: `Lectures (${totalClassLecturesCount})` },
            { key: 'attendance', label: 'Attendance & Results' },
          ] as { key: StudentPortalTab; label: string }[]
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

      {/* ACTIVE ONLINE QUIZ RUNNER MODAL */}
      {takingQuiz && (
        <div className="rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Live MCQ Assessment · {subjectName(takingQuiz.subjectId)}
              </p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {takingQuiz.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{takingQuiz.instructions}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right font-mono tabular-nums">
                <div className="text-[11px] text-slate-500">Time Remaining</div>
                <div
                  className={`text-lg font-bold ${
                    secondsLeft < 60
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatTimer(secondsLeft)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTakingQuiz(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {takingQuiz.questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="pb-5 border-b border-slate-200 dark:border-slate-800 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {qIdx + 1}. {q.questionText}
                  </p>
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {q.marks} Marks
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const selected = quizAnswers[qIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setQuizAnswers((prev) =>
                            prev.map((val, idx) => (idx === qIdx ? optIdx : val))
                          )
                        }
                        className={`text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors flex items-center gap-2.5 ${
                          selected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-medium'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-mono font-semibold">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Answered: {quizAnswers.filter((a) => a >= 0).length} / {takingQuiz.questions.length}
            </span>
            <button
              type="button"
              disabled={submittingQuiz}
              onClick={handleSubmitQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{submittingQuiz ? 'Submitting Quiz...' : 'Submit Final Answers'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* 4 KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500">My Attendance Rate</div>
              <div className="text-2xl font-bold font-mono mt-1">{attStats.rate}%</div>
              <div className="text-xs text-slate-500 mt-1.5">
                {attStats.present + attStats.late} present of {attStats.total} recorded days
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500">Online Quizzes</div>
              <div className="text-2xl font-bold font-mono mt-1">
                {quizAvgPercent !== null ? `${quizAvgPercent}%` : 'Pending'}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                {myQuizAttempts.length} of {studentQuizzes.length} quizzes attempted
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500">Course Assignments</div>
              <div className="text-2xl font-bold font-mono mt-1">
                {submittedAssignmentsCount} / {studentAssignments.length}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                {Math.max(0, studentAssignments.length - submittedAssignmentsCount)} pending submission
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500">Lectures Completed</div>
              <div className="text-2xl font-bold font-mono mt-1">
                {completedLecturesCount} / {totalClassLecturesCount}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                Self-paced class lecture modules
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pending Quizzes & Assignments */}
            <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Active Quizzes & Assignments</h2>
                <button
                  type="button"
                  onClick={() => setTab('quizzes')}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Open Assessments
                </button>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {studentQuizzes.map((qz) => {
                  const myAtt = qz.attempts.find((a) => a.studentId === activeStudent.id);
                  return (
                    <div key={qz.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {qz.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {subjectName(qz.subjectId)} · {qz.questions.length} MCQs · {qz.durationMins} mins · Due {qz.dueDate}
                        </div>
                      </div>
                      {myAtt ? (
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {myAtt.score}/{myAtt.totalMarks} ({myAtt.percentage}%)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTab('quizzes');
                            startQuizRunner(qz);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium shrink-0"
                        >
                          Start Quiz
                        </button>
                      )}
                    </div>
                  );
                })}

                {studentAssignments.map((hw) => {
                  const sub = hw.submissions.find((s) => s.studentId === activeStudent.id);
                  return (
                    <div key={hw.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {hw.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Assignment · {subjectName(hw.subjectId)} · Due {hw.dueDate}
                        </div>
                      </div>
                      {sub ? (
                        <span className="font-mono text-slate-700 dark:text-slate-300 shrink-0">
                          {sub.status === 'GRADED'
                            ? `Graded: ${sub.marks}/${hw.maxMarks || 20}`
                            : 'Submitted'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTab('assignments')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium shrink-0"
                        >
                          Submit Work
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campus Notices & Student Profile Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h2 className="text-sm font-semibold mb-3">Student Registration Record</h2>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Student Login ID</dt>
                    <dd className="font-mono font-semibold">{activeStudent.rollNo}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Class & Section</dt>
                    <dd className="font-medium">
                      {studentClass ? `${studentClass.name}-${studentClass.section}` : activeStudent.section}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Guardian</dt>
                    <dd className="font-medium">{activeStudent.guardianName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Emergency Contact</dt>
                    <dd className="font-mono">{activeStudent.guardianPhone}</dd>
                  </div>
                </dl>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h2 className="text-sm font-semibold mb-3">Class Announcements</h2>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {notices.slice(0, 3).map((n) => (
                    <div key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {n.content}
                      </p>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {n.category} · {n.publishDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ONLINE QUIZZES */}
      {tab === 'quizzes' && (
        <div className="space-y-4">
          {studentQuizzes.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-sm text-slate-500">
              No quizzes published for your class yet.
            </div>
          ) : (
            studentQuizzes.map((qz) => {
              const myAttempt = qz.attempts.find((a) => a.studentId === activeStudent.id);
              const isReviewOpen = reviewQuizId === qz.id;

              return (
                <div
                  key={qz.id}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {subjectName(qz.subjectId)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Instructor: {qz.teacherName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{qz.questions.length} Questions</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{qz.totalMarks} Marks</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {qz.durationMins} mins
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {qz.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {qz.instructions}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {myAttempt ? (
                        <>
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {myAttempt.score} / {myAttempt.totalMarks} ({myAttempt.percentage}%)
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Submitted {myAttempt.submittedAt.slice(0, 10)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReviewQuizId(isReviewOpen ? null : qz.id)}
                            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {isReviewOpen ? 'Hide Review' : 'Review Answers'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startQuizRunner(qz)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Attempt Quiz</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {myAttempt?.teacherRemarks && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Teacher Feedback:</span>{' '}
                      {myAttempt.teacherRemarks}
                    </div>
                  )}

                  {myAttempt && isReviewOpen && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                      {qz.questions.map((q, idx) => {
                        const chosen = myAttempt.answers[idx];
                        const isCorrect = chosen === q.correctOptionIndex;
                        return (
                          <div
                            key={q.id}
                            className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-start justify-between gap-3 font-medium text-slate-900 dark:text-slate-100">
                              <span>
                                {idx + 1}. {q.questionText}
                              </span>
                              <span
                                className={`font-mono shrink-0 ${
                                  isCorrect
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {isCorrect ? `+${q.marks}` : '0'} / {q.marks}
                              </span>
                            </div>
                            <div className="mt-1.5 text-slate-600 dark:text-slate-400 space-y-0.5">
                              <div>
                                Your Answer:{' '}
                                <strong className="text-slate-900 dark:text-slate-200">
                                  {chosen >= 0 && q.options[chosen]
                                    ? q.options[chosen]
                                    : 'Not Answered'}
                                </strong>
                              </div>
                              {!isCorrect && q.correctOptionIndex >= 0 && (
                                <div className="text-emerald-700 dark:text-emerald-400">
                                  Correct Option: <strong>{q.options[q.correctOptionIndex]}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {studentAssignments.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-sm text-slate-500">
              No assignments posted for your class yet.
            </div>
          ) : (
            studentAssignments.map((hw) => {
              const mySub = hw.submissions.find((s) => s.studentId === activeStudent.id);
              const maxMarks = hw.maxMarks || 20;

              return (
                <div
                  key={hw.id}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {subjectName(hw.subjectId)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Due: {hw.dueDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Max Marks: {maxMarks}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {hw.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {hw.description}
                      </p>
                      {hw.attachmentName && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-mono">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Reference File: {hw.attachmentName}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right font-mono text-xs shrink-0">
                      {mySub ? (
                        mySub.status === 'GRADED' ? (
                          <div>
                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {mySub.marks} / {maxMarks} Marks
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Graded by {mySub.gradedBy || 'Teacher'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-blue-700 dark:text-blue-400 font-semibold">
                            Submitted · Pending Grade
                          </div>
                        )
                      ) : (
                        <div className="text-amber-700 dark:text-amber-400 font-semibold">
                          Not Submitted
                        </div>
                      )}
                    </div>
                  </div>

                  {mySub && (
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500">
                        <span>Your Submission ({mySub.submittedAt.slice(0, 10)})</span>
                        <span className="font-mono">{mySub.attachmentName}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200">{mySub.notes}</p>
                      {mySub.feedback && (
                        <p className="pt-2 border-t border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">
                          <strong>Teacher Feedback:</strong> {mySub.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {mySub?.status !== 'GRADED' && (
                    <form
                      onSubmit={(e) => handleSubmitAssignment(e, hw)}
                      className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3"
                    >
                      <input
                        type="text"
                        required
                        value={assignmentNotes[hw.id] ?? mySub?.notes ?? ''}
                        onChange={(e) =>
                          setAssignmentNotes((p) => ({ ...p, [hw.id]: e.target.value }))
                        }
                        placeholder="Write your assignment answer, solution notes, or work summary..."
                        className="sm:col-span-6 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <input
                        type="text"
                        value={
                          assignmentFiles[hw.id] ??
                          mySub?.attachmentName ??
                          `${activeStudent.rollNo}_solution.pdf`
                        }
                        onChange={(e) =>
                          setAssignmentFiles((p) => ({ ...p, [hw.id]: e.target.value }))
                        }
                        placeholder="Attachment filename (e.g. solution.pdf)"
                        className="sm:col-span-4 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <button
                        type="submit"
                        disabled={submittingHwId === hw.id}
                        className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{mySub ? 'Resubmit' : 'Submit'}</span>
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: LECTURES */}
      {tab === 'lectures' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Filter Subject:</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="ALL">All Class Subjects</option>
                {classSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Completed: {completedLecturesCount} / {totalClassLecturesCount}
            </div>
          </div>

          {studentLectures.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-sm text-slate-500">
              No lectures found for the selected subject.
            </div>
          ) : (
            studentLectures.map((lec) => {
              const completed = lec.completedStudentIds.includes(activeStudent.id);
              const expanded = openLectureId === lec.id;

              return (
                <div
                  key={lec.id}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {subjectName(lec.subjectId)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{lec.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span>By {lec.teacherName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{lec.durationMins} mins</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {lec.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenLectureId(expanded ? null : lec.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{expanded ? 'Hide Notes' : 'Read Lecture'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleLectureComplete(lec.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          completed
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{completed ? 'Completed' : 'Mark Complete'}</span>
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {lec.notes}
                      </div>
                      {lec.videoUrl && (
                        <div>
                          <a
                            href={lec.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>Open External Video / Interactive Simulation</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 5: ATTENDANCE & EXAM RESULTS (Read-Only for Students) */}
      {tab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Read-Only Attendance Register */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">My Daily Attendance Record</h2>
                <p className="text-xs text-slate-500">
                  Read-only attendance log maintained by your class teacher
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Present: {attStats.present}
                </span>
                <span>·</span>
                <span className="text-amber-700 dark:text-amber-400">Late: {attStats.late}</span>
                <span>·</span>
                <span className="text-red-600 dark:text-red-400">Absent: {attStats.absent}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Marked By</th>
                    <th className="py-2.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {studentAtt.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No attendance entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    studentAtt.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 px-4 font-mono">{a.date}</td>
                        <td
                          className={`py-2.5 px-4 font-semibold ${
                            a.status === 'PRESENT'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : a.status === 'ABSENT'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {a.status}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                          {a.markedBy}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{a.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Term Exam & Quiz Results Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h2 className="text-sm font-semibold mb-1">Term Examination Result</h2>
              {latestExamStanding ? (
                <div className="space-y-4 mt-3">
                  <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {latestExamStanding.exam.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Class Position #{latestExamStanding.row.position} · GPA{' '}
                        {latestExamStanding.row.gpa.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {latestExamStanding.row.percentage}% ({latestExamStanding.row.grade})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {latestExamStanding.row.totalObtained} / {latestExamStanding.row.totalMax}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {latestExamStanding.row.subjectBreakdown.map((sb: SubjectMarkBreakdown) => (
                      <div key={sb.subjectId} className="flex items-center justify-between">
                        <span className="font-sans text-slate-700 dark:text-slate-300">
                          {sb.subjectName}
                        </span>
                        <span>
                          {sb.marksObtained}/{sb.maxMarks} ({sb.grade})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">
                  Term examination marks will appear here once published by your teacher.
                </p>
              )}
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h2 className="text-sm font-semibold mb-3">Quiz Score History</h2>
              {myQuizAttempts.length === 0 ? (
                <p className="text-xs text-slate-500">No quizzes attempted yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {myQuizAttempts.map(({ quiz, attempt }) => (
                    <div key={attempt.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {quiz.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {subjectName(quiz.subjectId)}
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-right shrink-0">
                        {attempt.score}/{attempt.totalMarks} ({attempt.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
