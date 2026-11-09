import React, { useEffect, useState } from 'react';
import { Plus, Upload, CheckCircle2 } from 'lucide-react';
import {
  Homework,
  SchoolClass,
  StaffMember,
  Subject,
  SyllabusPlan,
  TimetableSlot,
  UserRole,
} from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

type AcadTab = 'timetable' | 'homework' | 'syllabus' | 'classes';

const DAYS: TimetableSlot['dayOfWeek'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export function AcademicsPage() {
  const { user, hasRole } = useAuth();
  const { notify } = useToast();
  const isStaffEditor = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);
  const isAdmin = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const isStudentOrParent = hasRole(UserRole.STUDENT, UserRole.PARENT);

  const [tab, setTab] = useState<AcadTab>('timetable');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusPlan[]>([]);

  const [ttMode, setTtMode] = useState<'CLASS' | 'TEACHER'>('CLASS');
  const [selectedClassId, setSelectedClassId] = useState('cls-10a');
  const [selectedTeacherId, setSelectedTeacherId] = useState('stf-02');

  // Forms
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: 'Monday' as TimetableSlot['dayOfWeek'],
    periodNo: 4,
    startTime: '10:50',
    endTime: '11:40',
    subjectId: '',
    teacherId: 'stf-02',
    room: 'R-201',
  });

  const [hwForm, setHwForm] = useState({
    classId: 'cls-10a',
    subjectId: '',
    title: '',
    description: '',
    dueDate: '2026-11-04',
    attachmentName: '',
  });

  const [submitModalHw, setSubmitModalHw] = useState<Homework | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionFile, setSubmissionFile] = useState('');

  const [sylForm, setSylForm] = useState({
    classId: 'cls-10a',
    subjectId: '',
    unitTitle: '',
    topics: '',
    completionPercent: 25,
    targetDate: '2026-11-28',
  });

  const [classForm, setClassForm] = useState({
    name: 'Class 10th',
    section: 'B',
    roomNumber: 'R-111',
    capacity: 35,
  });

  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    classId: 'cls-10a',
    teacherId: 'stf-02',
  });

  useEffect(() => {
    Promise.all([
      apiRequest<{
        classes: SchoolClass[];
        subjects: Subject[];
        timetable: TimetableSlot[];
        homework: Homework[];
        syllabus: SyllabusPlan[];
      }>('/academics'),
      apiRequest<{ staff: StaffMember[] }>('/bootstrap'),
    ])
      .then(([ac, boot]) => {
        setClasses(ac.classes);
        setSubjects(ac.subjects);
        setTimetable(ac.timetable);
        setHomework(ac.homework);
        setSyllabus(ac.syllabus);
        setStaff(boot.staff);
        if (ac.subjects[0]) {
          setSlotForm((p) => ({ ...p, subjectId: ac.subjects[0].id }));
          setHwForm((p) => ({ ...p, subjectId: ac.subjects[0].id }));
          setSylForm((p) => ({ ...p, subjectId: ac.subjects[0].id }));
        }
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  const handleAddTimetableSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ slot: TimetableSlot }>('/academics/timetable', {
        method: 'POST',
        body: JSON.stringify({ ...slotForm, classId: selectedClassId }),
      });
      setTimetable((prev) => [...prev, res.slot]);
      notify('Timetable period added.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ homework: Homework }>('/academics/homework', {
        method: 'POST',
        body: JSON.stringify(hwForm),
      });
      setHomework((prev) => [res.homework, ...prev]);
      setHwForm((p) => ({ ...p, title: '', description: '', attachmentName: '' }));
      notify('Homework published to class.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleStudentSubmitHw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalHw) return;
    try {
      const res = await apiRequest<{ homework: Homework }>(
        `/academics/homework/${submitModalHw.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            studentId: user?.linkedStudentIds[0],
            notes: submissionNotes,
            attachmentName: submissionFile || 'assignment_solution.pdf',
          }),
        }
      );
      setHomework((prev) =>
        prev.map((h) => (h.id === res.homework.id ? res.homework : h))
      );
      setSubmitModalHw(null);
      setSubmissionNotes('');
      setSubmissionFile('');
      notify('Assignment submitted successfully.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ plan: SyllabusPlan }>('/academics/syllabus', {
        method: 'POST',
        body: JSON.stringify(sylForm),
      });
      setSyllabus((prev) => [res.plan, ...prev]);
      setSylForm((p) => ({ ...p, unitTitle: '', topics: '' }));
      notify('Lesson & syllabus unit added.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleUpdateSyllabusProgress = async (id: string, pct: number) => {
    try {
      const res = await apiRequest<{ plan: SyllabusPlan }>(`/academics/syllabus/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completionPercent: pct }),
      });
      setSyllabus((prev) => prev.map((p) => (p.id === id ? res.plan : p)));
      notify('Syllabus progress updated.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ schoolClass: SchoolClass }>('/academics/classes', {
        method: 'POST',
        body: JSON.stringify(classForm),
      });
      setClasses((prev) => [...prev, res.schoolClass]);
      notify(`Created ${res.schoolClass.name}-${res.schoolClass.section}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ subject: Subject }>('/academics/subjects', {
        method: 'POST',
        body: JSON.stringify(subjectForm),
      });
      setSubjects((prev) => [...prev, res.subject]);
      setSubjectForm((p) => ({ ...p, code: '', name: '' }));
      notify(`Added subject ${res.subject.name}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const filteredSlots = timetable.filter((slot) =>
    ttMode === 'CLASS'
      ? slot.classId === selectedClassId
      : slot.teacherId === selectedTeacherId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academics, Timetable & Curriculum
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Class & teacher schedules, homework assignments, and syllabus lesson trackers.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start overflow-x-auto max-w-full">
          {(
            [
              ['timetable', 'Timetable'],
              ['homework', 'Homework'],
              ['syllabus', 'Syllabus & Plans'],
              ['classes', 'Classes & Subjects'],
            ] as [AcadTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === key
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: TIMETABLE BUILDER */}
      {tab === 'timetable' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setTtMode('CLASS')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    ttMode === 'CLASS'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Class-Wise
                </button>
                <button
                  type="button"
                  onClick={() => setTtMode('TEACHER')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    ttMode === 'TEACHER'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Teacher-Wise
                </button>
              </div>

              {ttMode === 'CLASS' ? (
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
              ) : (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {staff.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {DAYS.map((day) => {
              const daySlots = filteredSlots
                .filter((s) => s.dayOfWeek === day)
                .sort((a, b) => a.periodNo - b.periodNo);
              return (
                <div
                  key={day}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                >
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                    {day}
                  </h3>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-slate-400">No scheduled periods</p>
                  ) : (
                    <div className="space-y-3">
                      {daySlots.map((slot) => {
                        const sub = subjects.find((s) => s.id === slot.subjectId);
                        const tch = staff.find((t) => t.id === slot.teacherId);
                        const cls = classes.find((c) => c.id === slot.classId);
                        return (
                          <div
                            key={slot.id}
                            className="pb-3 last:pb-0 border-b last:border-b-0 border-slate-100 dark:border-slate-800/80 text-xs"
                          >
                            <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400 tabular-nums">
                              P{slot.periodNo} · {slot.startTime}–{slot.endTime}
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                              {sub?.name || 'Subject'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {ttMode === 'CLASS'
                                ? tch?.name || 'Faculty'
                                : cls
                                ? `${cls.name}-${cls.section}`
                                : ''}{' '}
                              · {slot.room}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isStaffEditor && (
            <form
              onSubmit={handleAddTimetableSlot}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Add Timetable Period
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <select
                  value={slotForm.dayOfWeek}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, dayOfWeek: e.target.value as any })
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={slotForm.periodNo}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, periodNo: Number(e.target.value) })
                  }
                  placeholder="Period #"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
                <input
                  type="time"
                  value={slotForm.startTime}
                  onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
                <select
                  value={slotForm.subjectId}
                  onChange={(e) => setSlotForm({ ...slotForm, subjectId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={slotForm.teacherId}
                  onChange={(e) => setSlotForm({ ...slotForm, teacherId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {staff.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Slot
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: HOMEWORK & SUBMISSIONS */}
      {tab === 'homework' && (
        <div className="space-y-6">
          {isStaffEditor && (
            <form
              onSubmit={handleCreateHomework}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Assign New Homework / Coursework
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={hwForm.classId}
                  onChange={(e) => setHwForm({ ...hwForm, classId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - Section {c.section}
                    </option>
                  ))}
                </select>
                <select
                  value={hwForm.subjectId}
                  onChange={(e) => setHwForm({ ...hwForm, subjectId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  required
                  value={hwForm.dueDate}
                  onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  value={hwForm.title}
                  onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder="Assignment Title"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="file"
                  onChange={(e) =>
                    setHwForm({
                      ...hwForm,
                      attachmentName: e.target.files?.[0]?.name || '',
                    })
                  }
                  className="text-xs text-slate-500"
                />
              </div>
              <textarea
                rows={2}
                value={hwForm.description}
                onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                placeholder="Instructions, rubric, or exercise numbers..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
              >
                Publish Assignment
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {homework.map((hw) => {
              const cls = classes.find((c) => c.id === hw.classId);
              const sub = subjects.find((s) => s.id === hw.subjectId);
              const mySub = hw.submissions.find((s) =>
                user?.linkedStudentIds.includes(s.studentId)
              );
              return (
                <div key={hw.id} className="p-5 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">
                      {cls ? `${cls.name}-${cls.section}` : ''} · {sub?.name || 'Subject'} · Due{' '}
                      <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {hw.dueDate}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {hw.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{hw.description}</p>
                    {hw.attachmentName && (
                      <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                        Attachment: {hw.attachmentName}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start sm:items-end justify-between gap-2 shrink-0 text-xs">
                    <span className="font-mono text-slate-500 tabular-nums">
                      {hw.submissions.length} submission(s)
                    </span>
                    {isStudentOrParent && (
                      mySub ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted ({mySub.attachmentName})
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSubmitModalHw(hw)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 text-white font-medium"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Solution
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SYLLABUS & LESSON PLANS */}
      {tab === 'syllabus' && (
        <div className="space-y-6">
          {isStaffEditor && (
            <form
              onSubmit={handleCreateSyllabus}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Add Syllabus Unit / Lesson Plan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={sylForm.classId}
                  onChange={(e) => setSylForm({ ...sylForm, classId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}-{c.section}
                    </option>
                  ))}
                </select>
                <select
                  value={sylForm.subjectId}
                  onChange={(e) => setSylForm({ ...sylForm, subjectId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={sylForm.unitTitle}
                  onChange={(e) => setSylForm({ ...sylForm, unitTitle: e.target.value })}
                  placeholder="Unit Title (e.g. Unit 6: Optics)"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="date"
                  value={sylForm.targetDate}
                  onChange={(e) => setSylForm({ ...sylForm, targetDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  required
                  value={sylForm.topics}
                  onChange={(e) => setSylForm({ ...sylForm, topics: e.target.value })}
                  placeholder="Key Lesson Plan Topics..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium whitespace-nowrap"
                >
                  Save Lesson Plan
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {syllabus.map((plan) => {
              const sub = subjects.find((s) => s.id === plan.subjectId);
              const cls = classes.find((c) => c.id === plan.classId);
              return (
                <div key={plan.id} className="p-5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500">
                        {cls ? `${cls.name}-${cls.section}` : ''} · {sub?.name} · Target{' '}
                        <span className="font-mono">{plan.targetDate}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {plan.unitTitle}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{plan.topics}</p>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {plan.completionPercent}%
                      </span>
                      {isStaffEditor && (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={plan.completionPercent}
                          onChange={(e) =>
                            handleUpdateSyllabusProgress(plan.id, Number(e.target.value))
                          }
                          aria-label="Update syllabus completion percentage"
                          className="w-28 accent-blue-700"
                        />
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${plan.completionPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CLASSES & SUBJECTS */}
      {tab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Active Classes & Sections
            </h3>
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2">Class</th>
                  <th className="py-2">Room</th>
                  <th className="py-2 text-right">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 font-semibold">
                      {c.name} - Section {c.section}
                    </td>
                    <td className="py-2.5 font-mono">{c.roomNumber}</td>
                    <td className="py-2.5 text-right font-mono">{c.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isAdmin && (
              <form onSubmit={handleCreateClass} className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <input
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="Grade Name"
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  required
                  value={classForm.section}
                  onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                  placeholder="Section"
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  required
                  value={classForm.roomNumber}
                  onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
                  placeholder="Room No"
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-blue-700 text-white font-medium"
                >
                  Add Class
                </button>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Registered Subjects
            </h3>
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2">Code</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2 text-right">Max / Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 font-mono">{s.code}</td>
                    <td className="py-2.5 font-semibold">{s.name}</td>
                    <td className="py-2.5 text-right font-mono">
                      {s.totalMarks} / {s.passingMarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isAdmin && (
              <form onSubmit={handleCreateSubject} className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <input
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="Code (BIO-106)"
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="Subject Name"
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <select
                  value={subjectForm.classId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}-{c.section}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-blue-700 text-white font-medium"
                >
                  Add Subject
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Homework Submission Modal */}
      {submitModalHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Submit Homework Assignment
            </h3>
            <p className="text-xs text-slate-500 mb-4">{submitModalHw.title}</p>
            <form onSubmit={handleStudentSubmitHw} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Solution Notes</label>
                <textarea
                  rows={3}
                  required
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Briefly describe your submitted work..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Attach File (PDF / Image)</label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0]?.name || '')}
                  className="w-full text-xs text-slate-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalHw(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
                >
                  Submit Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
