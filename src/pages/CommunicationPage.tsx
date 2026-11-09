import React, { useEffect, useState } from 'react';
import { Send, Plus } from 'lucide-react';
import {
  CommunicationLog,
  Notice,
  PtmSchedule,
  SchoolClass,
  StaffMember,
  UserRole,
} from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { validateEmail, validatePhoneNumber } from '../lib/validation.ts';

type CommTab = 'notices' | 'messaging' | 'ptm';

export function CommunicationPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const canPublish = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);
  const canMessage = hasRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.ACCOUNTANT
  );

  const [tab, setTab] = useState<CommTab>('notices');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [ptms, setPtms] = useState<PtmSchedule[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    category: 'Academic',
    audience: 'ALL',
    content: '',
  });

  const [msgForm, setMsgForm] = useState({
    channel: 'SMS' as 'SMS' | 'WHATSAPP' | 'EMAIL',
    recipientName: 'All Grade 10 Guardians',
    recipientContact: '+92-300-9214450',
    subject: 'Academic Progress Update',
    message: '',
  });

  const [ptmForm, setPtmForm] = useState({
    title: '',
    date: '2026-11-07',
    timeSlot: '10:00 AM - 12:30 PM',
    classId: 'cls-10a',
    room: 'R-201',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      apiRequest<{
        notices: Notice[];
        communicationLogs: CommunicationLog[];
        ptmSchedules: PtmSchedule[];
      }>('/communication'),
      apiRequest<{ classes: SchoolClass[]; staff: StaffMember[] }>('/bootstrap'),
    ])
      .then(([commRes, bootRes]) => {
        setNotices(commRes.notices);
        setLogs(commRes.communicationLogs);
        setPtms(commRes.ptmSchedules);
        setClasses(bootRes.classes);
        setStaff(bootRes.staff);
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ notice: Notice }>('/communication/notices', {
        method: 'POST',
        body: JSON.stringify(noticeForm),
      });
      setNotices((prev) => [res.notice, ...prev]);
      setNoticeForm((p) => ({ ...p, title: '', content: '' }));
      notify('Announcement published to notice board.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const contactStr = msgForm.recipientContact.trim();
    if (msgForm.channel === 'EMAIL') {
      const emailVal = validateEmail(contactStr, 'Recipient Email');
      if (!emailVal.valid) {
        notify(emailVal.error!, 'error');
        return;
      }
    } else {
      const phoneVal = validatePhoneNumber(contactStr, 'Recipient Phone');
      if (!phoneVal.valid) {
        notify(phoneVal.error!, 'error');
        return;
      }
    }

    try {
      const res = await apiRequest<{ log: CommunicationLog }>(
        '/communication/messages',
        {
          method: 'POST',
          body: JSON.stringify(msgForm),
        }
      );
      setLogs((prev) => [res.log, ...prev]);
      setMsgForm((p) => ({ ...p, message: '' }));
      notify(`${res.log.channel} dispatch queued and logged.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSchedulePtm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ ptm: PtmSchedule }>('/communication/ptm', {
        method: 'POST',
        body: JSON.stringify(ptmForm),
      });
      setPtms((prev) => [res.ptm, ...prev]);
      setPtmForm((p) => ({ ...p, title: '', notes: '' }));
      notify('Parent-Teacher Meeting scheduled.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Communication & Parent Engagement
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Official notice board, SMS / WhatsApp / Email gateway broadcasts, and PTM scheduling.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTab('notices')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'notices'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Notice Board
          </button>
          {canMessage && (
            <button
              type="button"
              onClick={() => setTab('messaging')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'messaging'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              SMS / WhatsApp / Email
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('ptm')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'ptm'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            PTM Schedule
          </button>
        </div>
      </div>

      {/* TAB 1: NOTICE BOARD */}
      {tab === 'notices' && (
        <div className="space-y-6">
          {canPublish && (
            <form
              onSubmit={handlePublishNotice}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Post Institutional Announcement
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  required
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="Announcement Title"
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <select
                  value={noticeForm.category}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, category: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Academic">Academic</option>
                  <option value="Examination">Examination</option>
                  <option value="Event">Event</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Fee">Fee</option>
                </select>
                <select
                  value={noticeForm.audience}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, audience: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="ALL">All Campus</option>
                  <option value="PARENTS">Parents Only</option>
                  <option value="STUDENTS">Students Only</option>
                  <option value="TEACHERS">Faculty Only</option>
                </select>
              </div>
              <textarea
                rows={2}
                required
                value={noticeForm.content}
                onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                placeholder="Write official notice details..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
              >
                Publish Notice
              </button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {notices.map((n) => (
              <div key={n.id} className="p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{n.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Audience: {n.audience}</span>
                  <span aria-hidden="true">·</span>
                  <span>By {n.publishedBy}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{n.publishDate}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {n.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {n.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SMS / WHATSAPP / EMAIL GATEWAY */}
      {tab === 'messaging' && canMessage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSendMessage}
            className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs self-start"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Send Parent Alert (SMS / WhatsApp / Email)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['SMS', 'WHATSAPP', 'EMAIL'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setMsgForm({ ...msgForm, channel: ch })}
                  className={`py-2 rounded-lg border font-medium ${
                    msgForm.channel === ch
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <input
              required
              value={msgForm.recipientName}
              onChange={(e) => setMsgForm({ ...msgForm, recipientName: e.target.value })}
              placeholder="Recipient / Guardian Group"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              required
              value={msgForm.recipientContact}
              onChange={(e) =>
                setMsgForm({ ...msgForm, recipientContact: e.target.value })
              }
              placeholder="Phone (+92...) or Email"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
            <input
              required
              value={msgForm.subject}
              onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
              placeholder="Subject"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <textarea
              rows={3}
              required
              value={msgForm.message}
              onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })}
              placeholder="Type SMS, WhatsApp, or Email message body..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-700 text-white font-medium"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch via {msgForm.channel} Gateway
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            <div className="px-5 py-3.5 text-xs font-semibold text-slate-900 dark:text-white">
              Gateway Delivery Log ({logs.length})
            </div>
            {logs.map((l) => (
              <div key={l.id} className="p-4 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    [{l.channel}] {l.subject}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    {l.status} · {l.sentAt.slice(0, 10)}
                  </span>
                </div>
                <div className="text-slate-500">
                  To: {l.recipientName} (<span className="font-mono">{l.recipientContact}</span>)
                </div>
                <p className="text-slate-600 dark:text-slate-400">{l.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PTM SCHEDULING */}
      {tab === 'ptm' && (
        <div className="space-y-6">
          {canPublish && (
            <form
              onSubmit={handleSchedulePtm}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Schedule Parent-Teacher Meeting Slot
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  required
                  value={ptmForm.title}
                  onChange={(e) => setPtmForm({ ...ptmForm, title: e.target.value })}
                  placeholder="Conference Title"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="date"
                  required
                  value={ptmForm.date}
                  onChange={(e) => setPtmForm({ ...ptmForm, date: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
                <input
                  required
                  value={ptmForm.timeSlot}
                  onChange={(e) => setPtmForm({ ...ptmForm, timeSlot: e.target.value })}
                  placeholder="Time Slot"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <select
                  value={ptmForm.classId}
                  onChange={(e) => setPtmForm({ ...ptmForm, classId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}-{c.section}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={ptmForm.notes}
                  onChange={(e) => setPtmForm({ ...ptmForm, notes: e.target.value })}
                  placeholder="Agenda or preparation notes for guardians..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white font-medium whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule PTM
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {ptms.map((p) => {
              const cls = classes.find((c) => c.id === p.classId);
              const tch = staff.find((t) => t.id === p.teacherId);
              return (
                <div key={p.id} className="p-5 flex flex-col sm:flex-row justify-between gap-2 text-xs">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.title}
                    </h3>
                    <p className="text-slate-500 mt-0.5">
                      {cls ? `${cls.name}-${cls.section}` : ''} · Lead: {tch?.name || 'Faculty'} · Room {p.room}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{p.notes}</p>
                  </div>
                  <div className="font-mono text-right shrink-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{p.date}</div>
                    <div className="text-slate-500">{p.timeSlot}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
