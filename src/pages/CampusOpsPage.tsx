import React, { useEffect, useState } from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import {
  HostelRoom,
  InventoryItem,
  LibraryBook,
  LibraryIssue,
  StaffMember,
  Student,
  TransportRoute,
  UserRole,
} from '../types/index.ts';
import { apiRequest, formatPKR } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { AcademicCrestSvg, PrintPreviewModal } from '../components/ui/PrintPreviewModal.tsx';
import {
  validateFullName,
  validatePhoneNumber,
  validatePositiveAmount,
} from '../lib/validation.ts';

type OpsTab = 'library' | 'transport' | 'hostel' | 'inventory' | 'idcards';

export function CampusOpsPage() {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const canEdit = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const canIssueLib = hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);

  const [tab, setTab] = useState<OpsTab>('library');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [issues, setIssues] = useState<LibraryIssue[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Forms
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'Sciences',
    totalCopies: 10,
    shelfLocation: 'B-08',
  });
  const [issueForm, setIssueForm] = useState({
    bookId: '',
    studentId: '',
    dueDate: '2026-11-12',
  });
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    stops: '',
    vehicleNo: '',
    driverName: '',
    driverPhone: '',
    monthlyFee: 4800,
  });
  const [roomForm, setRoomForm] = useState({
    blockName: 'Jinnah Scholars Block',
    roomNo: '',
    roomType: 'Twin Sharing' as HostelRoom['roomType'],
    capacity: 2,
    monthlyFee: 14000,
    wardenName: 'Maj. (R) Sohail Anwar',
  });
  const [invForm, setInvForm] = useState({
    name: '',
    category: 'Lab Equipment' as InventoryItem['category'],
    quantity: 20,
    minThreshold: 10,
    unit: 'Units',
    location: 'Science Store',
  });

  // ID Card Studio state
  const [cardType, setCardType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [printIdCardOpen, setPrintIdCardOpen] = useState(false);

  const loadAll = () => {
    Promise.all([
      apiRequest<{
        libraryBooks: LibraryBook[];
        libraryIssues: LibraryIssue[];
        transportRoutes: TransportRoute[];
        hostelRooms: HostelRoom[];
        inventory: InventoryItem[];
      }>('/operations'),
      apiRequest<{ students: Student[] }>('/students'),
      apiRequest<{ staff: StaffMember[] }>('/bootstrap'),
    ])
      .then(([ops, stRes, bootRes]) => {
        setBooks(ops.libraryBooks);
        setIssues(ops.libraryIssues);
        setRoutes(ops.transportRoutes);
        setRooms(ops.hostelRooms);
        setInventory(ops.inventory);
        setStudents(stRes.students);
        setStaff(bootRes.staff);
        if (ops.libraryBooks[0]) setIssueForm((p) => ({ ...p, bookId: ops.libraryBooks[0].id }));
        if (stRes.students[0]) {
          setIssueForm((p) => ({ ...p, studentId: stRes.students[0].id }));
          setSelectedPersonId(stRes.students[0].id);
        }
      })
      .catch((err) => notify(err.message, 'error'));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ book: LibraryBook }>('/operations/library/books', {
        method: 'POST',
        body: JSON.stringify(bookForm),
      });
      setBooks((prev) => [res.book, ...prev]);
      setBookForm((p) => ({ ...p, title: '', author: '' }));
      notify('Book added to library catalog.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/operations/library/issues', {
        method: 'POST',
        body: JSON.stringify(issueForm),
      });
      loadAll();
      notify('Book issued to student.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleReturnBook = async (id: string) => {
    try {
      await apiRequest(`/operations/library/issues/${id}/return`, {
        method: 'PUT',
        body: JSON.stringify({ fineAmount: 0 }),
      });
      loadAll();
      notify('Book returned to shelf.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();

    const dNameCheck = validateFullName(routeForm.driverName, 'Driver Name');
    if (!dNameCheck.valid) {
      notify(dNameCheck.error!, 'error');
      return;
    }
    const dPhoneCheck = validatePhoneNumber(routeForm.driverPhone, 'Driver Phone');
    if (!dPhoneCheck.valid) {
      notify(dPhoneCheck.error!, 'error');
      return;
    }
    const feeCheck = validatePositiveAmount(routeForm.monthlyFee, 'Monthly Route Fee');
    if (!feeCheck.valid) {
      notify(feeCheck.error!, 'error');
      return;
    }

    try {
      const res = await apiRequest<{ route: TransportRoute }>('/operations/transport', {
        method: 'POST',
        body: JSON.stringify(routeForm),
      });
      setRoutes((prev) => [...prev, res.route]);
      setRouteForm((p) => ({ ...p, routeName: '', stops: '', vehicleNo: '', driverName: '' }));
      notify('Transport route registered.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (roomForm.wardenName && roomForm.wardenName.trim()) {
      const wCheck = validateFullName(roomForm.wardenName, 'Warden Name');
      if (!wCheck.valid) {
        notify(wCheck.error!, 'error');
        return;
      }
    }
    const feeCheck = validatePositiveAmount(roomForm.monthlyFee, 'Monthly Hostel Fee');
    if (!feeCheck.valid) {
      notify(feeCheck.error!, 'error');
      return;
    }

    try {
      const res = await apiRequest<{ room: HostelRoom }>('/operations/hostel', {
        method: 'POST',
        body: JSON.stringify(roomForm),
      });
      setRooms((prev) => [...prev, res.room]);
      setRoomForm((p) => ({ ...p, roomNo: '' }));
      notify('Hostel room added.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ item: InventoryItem }>('/operations/inventory', {
        method: 'POST',
        body: JSON.stringify(invForm),
      });
      setInventory((prev) => [res.item, ...prev]);
      setInvForm((p) => ({ ...p, name: '' }));
      notify('Stock item added.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAdjustStock = async (id: string, nextQty: number) => {
    try {
      const res = await apiRequest<{ item: InventoryItem }>(`/operations/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: Math.max(0, nextQty) }),
      });
      setInventory((prev) => prev.map((i) => (i.id === id ? res.item : i)));
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedPersonId) || students[0];
  const selectedStaff = staff.find((s) => s.id === selectedPersonId) || staff[0];

  const renderCardContent = () => {
    if (cardType === 'STUDENT' && selectedStudent) {
      return (
        <div className="w-80 mx-auto rounded-xl border border-slate-300 bg-white text-slate-900 overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
            <AcademicCrestSvg className="w-9 h-9 shrink-0" />
            <div>
              <div className="text-xs font-bold tracking-tight">GBPS: Kando Lund</div>
              <div className="text-[10px] text-slate-300">Official Student Identity Card</div>
            </div>
          </div>
          <div className="p-5 space-y-3 text-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-base text-slate-700">
                {selectedStudent.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{selectedStudent.name}</div>
                <div className="font-mono text-[11px] text-blue-700">{selectedStudent.rollNo}</div>
                <div className="text-[11px] text-slate-500">{selectedStudent.admissionNo}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <span className="text-slate-500">Blood:</span>{' '}
                <strong>{selectedStudent.bloodGroup}</strong>
              </div>
              <div>
                <span className="text-slate-500">Section:</span>{' '}
                <strong>{selectedStudent.section}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Emergency:</span>{' '}
                <strong className="font-mono">{selectedStudent.guardianPhone}</strong>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 font-mono text-[10px] tracking-[0.25em] text-center text-slate-400">
              ||| |||| || | |||| ||| ||||
            </div>
          </div>
        </div>
      );
    }

    if (cardType === 'STAFF' && selectedStaff) {
      return (
        <div className="w-80 mx-auto rounded-xl border border-slate-300 bg-white text-slate-900 overflow-hidden">
          <div className="bg-blue-900 text-white px-4 py-3 flex items-center gap-3">
            <AcademicCrestSvg className="w-9 h-9 shrink-0" />
            <div>
              <div className="text-xs font-bold tracking-tight">GBPS: Kando Lund</div>
              <div className="text-[10px] text-blue-200">Faculty & Staff Identity Card</div>
            </div>
          </div>
          <div className="p-5 space-y-3 text-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-base text-slate-700">
                {selectedStaff.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{selectedStaff.name}</div>
                <div className="text-[11px] text-slate-600">{selectedStaff.designation}</div>
                <div className="font-mono text-[11px] text-blue-700">
                  {selectedStaff.employeeCode}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
              <div>
                <span className="text-slate-500">Department:</span>{' '}
                <strong>{selectedStaff.department}</strong>
              </div>
              <div>
                <span className="text-slate-500">Contact:</span>{' '}
                <strong className="font-mono">{selectedStaff.phone}</strong>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 font-mono text-[10px] tracking-[0.25em] text-center text-slate-400">
              |||| || |||| ||| || |||| |||
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Campus Operations & Facilities
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Library circulation, transport fleet, hostel boarding, stock inventory, and printable ID cards.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start overflow-x-auto max-w-full">
          {(
            [
              ['library', 'Library'],
              ['transport', 'Transport'],
              ['hostel', 'Hostel'],
              ['inventory', 'Inventory'],
              ['idcards', 'ID Cards'],
            ] as [OpsTab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === k
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* LIBRARY */}
      {tab === 'library' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Book Catalog & Shelf Availability</h3>
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2">Title & Author</th>
                    <th className="py-2">Shelf</th>
                    <th className="py-2 text-right">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {books.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5">
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.author} · <span className="font-mono">{b.isbn}</span>
                        </div>
                      </td>
                      <td className="py-2.5 font-mono">{b.shelfLocation}</td>
                      <td className="py-2.5 text-right font-mono font-semibold">
                        {b.availableCopies} / {b.totalCopies}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {canEdit && (
                <form
                  onSubmit={handleAddBook}
                  className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
                >
                  <input
                    required
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    placeholder="Book Title"
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <input
                    required
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="Author"
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-blue-700 text-white font-medium"
                  >
                    Add Book
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              {canIssueLib && (
                <form
                  onSubmit={handleIssueBook}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs"
                >
                  <h3 className="text-sm font-semibold">Issue Book to Student</h3>
                  <select
                    value={issueForm.bookId}
                    onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.availableCopies} left)
                      </option>
                    ))}
                  </select>
                  <select
                    value={issueForm.studentId}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, studentId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.rollNo} — {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    required
                    value={issueForm.dueDate}
                    onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-blue-700 text-white font-medium"
                  >
                    Confirm Issue
                  </button>
                </form>
              )}

              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
                <h3 className="text-sm font-semibold">Circulation & Fines</h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {issues.map((iss) => {
                    const bk = books.find((b) => b.id === iss.bookId);
                    const st = students.find((s) => s.id === iss.studentId);
                    return (
                      <div key={iss.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{bk?.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {st?.name} · Due <span className="font-mono">{iss.dueDate}</span>
                            {iss.fineAmount > 0 ? ` · Fine ${formatPKR(iss.fineAmount)}` : ''}
                          </div>
                        </div>
                        {iss.status !== 'RETURNED' && canIssueLib ? (
                          <button
                            type="button"
                            onClick={() => handleReturnBook(iss.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 whitespace-nowrap"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Return
                          </button>
                        ) : (
                          <span className="font-mono text-emerald-700 dark:text-emerald-400">
                            {iss.status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSPORT */}
      {tab === 'transport' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Route & Corridor Stops</th>
                  <th className="py-3 px-4">Vehicle & Driver</th>
                  <th className="py-3 px-4 text-right">Monthly Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {routes.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 font-mono font-semibold">{r.routeCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{r.routeName}</div>
                      <div className="text-[11px] text-slate-500">{r.stops}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{r.vehicleNo}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {r.driverName} · {r.driverPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatPKR(r.monthlyFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <form
              onSubmit={handleAddRoute}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs"
            >
              <input
                required
                value={routeForm.routeName}
                onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
                placeholder="Route Name"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                required
                value={routeForm.stops}
                onChange={(e) => setRouteForm({ ...routeForm, stops: e.target.value })}
                placeholder="Stops"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                required
                value={routeForm.vehicleNo}
                onChange={(e) => setRouteForm({ ...routeForm, vehicleNo: e.target.value })}
                placeholder="Vehicle Reg No"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                required
                value={routeForm.driverName}
                onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })}
                placeholder="Driver Name"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
              >
                Add Route
              </button>
            </form>
          )}
        </div>
      )}

      {/* HOSTEL */}
      {tab === 'hostel' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Room No</th>
                  <th className="py-3 px-4">Residence Block</th>
                  <th className="py-3 px-4">Type & Capacity</th>
                  <th className="py-3 px-4">Warden</th>
                  <th className="py-3 px-4 text-right">Monthly Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rooms.map((rm) => {
                  const occupied = students.filter((s) => s.hostelRoomId === rm.id).length;
                  return (
                    <tr key={rm.id}>
                      <td className="py-3 px-4 font-mono font-semibold">{rm.roomNo}</td>
                      <td className="py-3 px-4">{rm.blockName}</td>
                      <td className="py-3 px-4 font-mono">
                        {rm.roomType} ({occupied}/{rm.capacity} beds)
                      </td>
                      <td className="py-3 px-4">{rm.wardenName}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatPKR(rm.monthlyFee)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <form
              onSubmit={handleAddRoom}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
            >
              <input
                required
                value={roomForm.blockName}
                onChange={(e) => setRoomForm({ ...roomForm, blockName: e.target.value })}
                placeholder="Block Name"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                required
                value={roomForm.roomNo}
                onChange={(e) => setRoomForm({ ...roomForm, roomNo: e.target.value })}
                placeholder="Room No (e.g. JB-105)"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="number"
                value={roomForm.monthlyFee}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, monthlyFee: Number(e.target.value) })
                }
                placeholder="Monthly Fee"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
              >
                Add Hostel Room
              </button>
            </form>
          )}
        </div>
      )}

      {/* INVENTORY */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Asset / Stock Item</th>
                  <th className="py-3 px-4">Category & Location</th>
                  <th className="py-3 px-4 text-right">In Stock</th>
                  {canEdit && <th className="py-3 px-4 text-right">Adjust</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {inventory.map((item) => {
                  const low = item.quantity <= item.minThreshold;
                  return (
                    <tr key={item.id}>
                      <td className="py-3 px-4 font-mono">{item.itemCode}</td>
                      <td className="py-3 px-4 font-semibold">{item.name}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.category} · {item.location}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={
                            low
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'font-semibold'
                          }
                        >
                          {item.quantity} {item.unit}
                        </span>
                        {low && <span className="text-[11px] text-red-600 ml-1.5">(Low)</span>}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, item.quantity - 1)}
                              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, item.quantity + 5)}
                              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <form
              onSubmit={handleAddInventory}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
            >
              <input
                required
                value={invForm.name}
                onChange={(e) => setInvForm({ ...invForm, name: e.target.value })}
                placeholder="Item Name"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <select
                value={invForm.category}
                onChange={(e) => setInvForm({ ...invForm, category: e.target.value as any })}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Lab Equipment">Lab Equipment</option>
                <option value="IT Hardware">IT Hardware</option>
                <option value="Stationery">Stationery</option>
                <option value="Furniture">Furniture</option>
                <option value="Sports">Sports</option>
              </select>
              <input
                type="number"
                value={invForm.quantity}
                onChange={(e) =>
                  setInvForm({ ...invForm, quantity: Number(e.target.value) })
                }
                placeholder="Initial Qty"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium"
              >
                Add Stock Item
              </button>
            </form>
          )}
        </div>
      )}

      {/* ID CARD GENERATOR */}
      {tab === 'idcards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs">
            <h3 className="text-sm font-semibold">Printable ID Card Studio</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCardType('STUDENT');
                  if (students[0]) setSelectedPersonId(students[0].id);
                }}
                className={`py-2 rounded-lg border font-medium ${
                  cardType === 'STUDENT'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                Student ID Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardType('STAFF');
                  if (staff[0]) setSelectedPersonId(staff[0].id);
                }}
                className={`py-2 rounded-lg border font-medium ${
                  cardType === 'STAFF'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                Staff ID Card
              </button>
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Select {cardType === 'STUDENT' ? 'Student' : 'Faculty / Staff'}
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {cardType === 'STUDENT'
                  ? students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.rollNo} — {s.name}
                      </option>
                    ))
                  : staff.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} — {emp.name}
                      </option>
                    ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setPrintIdCardOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium"
            >
              <Printer className="w-4 h-4" />
              Print / Export PDF ID Card
            </button>
          </div>

          <div className="lg:col-span-7 p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center">
            {renderCardContent()}
          </div>
        </div>
      )}

      <PrintPreviewModal
        open={printIdCardOpen}
        onClose={() => setPrintIdCardOpen(false)}
        title="Campus Identity Card Print Sheet"
        documentSubtitle="Campus Security & Identification Unit"
      >
        <div className="py-4">{renderCardContent()}</div>
      </PrintPreviewModal>
    </div>
  );
}
