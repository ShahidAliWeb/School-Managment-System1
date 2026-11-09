import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store, calculateGradeInfo } from '../db.ts';
import {
  authenticateToken,
  authorizeRoles,
  signToken,
  AuthenticatedRequest,
} from '../middleware/auth.ts';
import {
  UserRole,
  Student,
  AttendanceStatus,
  DatabaseSchema,
  LmsQuizQuestion,
} from '../../src/types/index.ts';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validateDateOfBirth,
  validateAddress,
  validateCNIC,
  validatePercentage,
  validatePositiveAmount,
} from '../../src/lib/validation.ts';

const router = Router();

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const clientIp = (req: AuthenticatedRequest): string =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
  req.socket.remoteAddress ||
  '127.0.0.1';

// ============================================================================
// 1. AUTHENTICATION & DEMO ROLE ACCOUNTS
// ============================================================================
router.post('/auth/login', (req, res) => {
  try {
    const { identifier, email, password } = req.body as {
      identifier?: string;
      email?: string;
      password?: string;
    };
    const rawLogin = (identifier || email || '').trim().toLowerCase();
    if (!rawLogin || !password) {
      res.status(400).json({ error: 'Student ID / Email and password are required.' });
      return;
    }

    const db = store.getState();
    const user = db.users.find((u) => {
      if (u.loginId && u.loginId.toLowerCase() === rawLogin) return true;
      if (u.email.toLowerCase() === rawLogin) return true;
      if (u.role === UserRole.STUDENT && u.linkedStudentIds.length > 0) {
        const linkedStd = db.students.find((s) => s.id === u.linkedStudentIds[0]);
        if (
          linkedStd &&
          (linkedStd.rollNo.toLowerCase() === rawLogin ||
            linkedStd.admissionNo.toLowerCase() === rawLogin)
        ) {
          return true;
        }
      }
      if (u.role === UserRole.TEACHER && u.linkedStaffId) {
        const linkedStf = db.staff.find((s) => s.id === u.linkedStaffId);
        if (linkedStf && linkedStf.employeeCode.toLowerCase() === rawLogin) {
          return true;
        }
      }
      return false;
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid Student ID / Email or password.' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid Student ID / Email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'This user account has been deactivated.' });
      return;
    }

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      linkedStudentIds: user.linkedStudentIds,
      linkedStaffId: user.linkedStaffId,
    });

    store.logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'User Sign-In',
      module: 'Authentication',
      details: `Authenticated via LMS JWT session (${user.role} · ${user.loginId || user.email}).`,
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        '127.0.0.1',
    });

    const { passwordHash: _removed, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication service failed.' });
  }
});

router.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  const found = db.users.find((u) => u.id === req.user?.id);
  if (!found) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }
  const { passwordHash: _removed, ...safeUser } = found;
  res.json({ user: safeUser });
});

// ============================================================================
// 2. DASHBOARD & ANALYTICS SUMMARY (Role-Aware)
// ============================================================================
router.get('/dashboard/summary', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  const activeStudents = db.students.filter((s) => s.status === 'ACTIVE');
  const totalStudents = activeStudents.length;
  const totalStaff = db.staff.filter((s) => s.status === 'ACTIVE').length;

  const totalAtt = db.studentAttendance.length;
  const presentAtt = db.studentAttendance.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE'
  ).length;
  const attendanceRate = totalAtt > 0 ? Number(((presentAtt / totalAtt) * 100).toFixed(1)) : 94.5;

  const feeBilled = db.feeVouchers.reduce((sum, v) => sum + v.netAmount, 0);
  const feeCollected = db.feeVouchers.reduce((sum, v) => sum + v.paidAmount, 0);
  const feePending = Math.max(0, feeBilled - feeCollected);
  const defaultersCount = db.feeVouchers.filter(
    (v) => v.status === 'OVERDUE' || v.status === 'UNPAID' || v.status === 'PARTIAL'
  ).length;

  // Attendance trend across months (seeded historical + live October)
  const attendanceTrend = [
    { month: 'May', rate: 93.4 },
    { month: 'Jun', rate: 91.8 },
    { month: 'Aug', rate: 95.2 },
    { month: 'Sep', rate: 94.6 },
    { month: 'Oct', rate: attendanceRate },
  ];

  // Fee breakdown per class
  const feeByClass = db.classes.map((cls) => {
    const vouchers = db.feeVouchers.filter((v) => v.classId === cls.id);
    const collected = vouchers.reduce((s, v) => s + v.paidAmount, 0);
    const pending = vouchers.reduce((s, v) => s + (v.netAmount - v.paidAmount), 0);
    return {
      className: `${cls.name}-${cls.section}`,
      collected,
      pending,
    };
  });

  // Class enrollment distribution
  const enrollmentByClass = db.classes.map((cls) => ({
    className: `${cls.name}-${cls.section}`,
    enrolled: db.students.filter((s) => s.classId === cls.id && s.status === 'ACTIVE').length,
    capacity: cls.capacity,
  }));

  const quizAttemptsCount = (db.quizzes || []).reduce((s, q) => s + q.attempts.length, 0);
  const assignmentSubmissionsCount = db.homework.reduce((s, h) => s + h.submissions.length, 0);

  res.json({
    kpis: {
      totalStudents,
      totalStaff,
      attendanceRate,
      feeCollected,
      feePending,
      defaultersCount,
      pendingLeaves: db.leaveRequests.filter((l) => l.status === 'PENDING').length,
      lowStockItems: db.inventory.filter((i) => i.quantity <= i.minThreshold).length,
      totalLectures: (db.lectures || []).length,
      totalQuizzes: (db.quizzes || []).length,
      totalAssignments: db.homework.length,
      quizAttemptsCount,
      assignmentSubmissionsCount,
    },
    attendanceTrend,
    feeByClass,
    enrollmentByClass,
    notices: db.notices.slice(0, 5),
    upcomingPtm: db.ptmSchedules,
    recentLogs:
      req.user?.role === UserRole.SUPER_ADMIN
        ? db.activityLogs.slice(0, 8)
        : [],
  });
});

// ============================================================================
// 3. REFERENCE LOOKUP BUNDLE (Classes, Subjects, Staff minimal directory)
// ============================================================================
router.get('/bootstrap', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  res.json({
    classes: db.classes,
    subjects: db.subjects,
    staff: db.staff,
    transportRoutes: db.transportRoutes,
    hostelRooms: db.hostelRooms,
  });
});

// ============================================================================
// 4. MODULE 1: STUDENT MANAGEMENT
// ============================================================================
router.get('/students', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  const role = req.user!.role;

  let list = db.students;
  if (role === UserRole.STUDENT || role === UserRole.PARENT) {
    list = db.students.filter((s) => req.user!.linkedStudentIds.includes(s.id));
  }

  res.json({ students: list, classes: db.classes });
});

router.post(
  '/students',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const body = req.body as Partial<Student>;
    // 1. Full Name validation (real human names, 2-100 chars, letters/hyphen/apostrophe/space only)
    const nameVal = validateFullName(body.name, 'Student Full Name');
    if (!nameVal.valid) {
      res.status(400).json({ error: nameVal.error });
      return;
    }

    // 2. Guardian Name validation
    const gNameVal = validateFullName(body.guardianName, 'Guardian Name');
    if (!gNameVal.valid) {
      res.status(400).json({ error: gNameVal.error });
      return;
    }

    // 3. Guardian Phone validation (Pakistan / E.164 normalization)
    const phoneVal = validatePhoneNumber(body.guardianPhone, 'Guardian Phone');
    if (!phoneVal.valid) {
      res.status(400).json({ error: phoneVal.error });
      return;
    }

    // 4. Guardian Email validation & lowercase normalization
    let normalizedEmail = '';
    if (body.guardianEmail && String(body.guardianEmail).trim()) {
      const emailVal = validateEmail(body.guardianEmail, 'Guardian Email');
      if (!emailVal.valid) {
        res.status(400).json({ error: emailVal.error });
        return;
      }
      normalizedEmail = emailVal.normalized!;
    } else {
      normalizedEmail = 'guardian@gbpskl.edu.pk';
    }

    // 5. Date of Birth validation (reasonable student age between 3 and 25 years)
    const rawDob = body.dob || '2011-01-15';
    const dobVal = validateDateOfBirth(rawDob, 'STUDENT', 'Student Date of Birth');
    if (!dobVal.valid) {
      res.status(400).json({ error: dobVal.error });
      return;
    }

    // 6. Address validation
    const rawAddress = body.address || 'Kando Lund, District Dadu, Sindh';
    const addressVal = validateAddress(rawAddress, 'Residential Address');
    if (!addressVal.valid) {
      res.status(400).json({ error: addressVal.error });
      return;
    }

    // 7. CNIC validation
    const cnicVal = validateCNIC(body.guardianCnic, 'Guardian CNIC');
    if (!cnicVal.valid) {
      res.status(400).json({ error: cnicVal.error });
      return;
    }

    // 8. Scholarship percentage validation
    const scholarshipVal = validatePercentage(body.scholarshipPercent ?? 0, 'Scholarship Percentage');
    if (!scholarshipVal.valid) {
      res.status(400).json({ error: scholarshipVal.error });
      return;
    }

    const cls = db.classes.find((c) => c.id === body.classId);
    if (!cls) {
      res.status(400).json({ error: 'Selected class does not exist.' });
      return;
    }

    const seq = db.students.length + 101;
    const admDate = body.admissionDate || new Date().toISOString().slice(0, 10);
    const [admYear, admMonth] = admDate.split('-');
    const rollSeq = String(db.students.length + 1).padStart(3, '0');
    const generatedRollNo = `${admMonth || '10'}-${admYear || '2026'}-${rollSeq}`;

    const newStudent: Student = {
      id: uid('std'),
      admissionNo: body.admissionNo?.trim() || `ADM-${admYear || '2026'}-${seq}`,
      rollNo: body.rollNo?.trim() || generatedRollNo,
      name: nameVal.normalized!,
      gender: body.gender === 'Female' ? 'Female' : 'Male',
      dob: dobVal.normalized!,
      bloodGroup: body.bloodGroup || 'O+',
      classId: cls.id,
      section: cls.section,
      admissionDate: admDate,
      status: 'ACTIVE',
      address: addressVal.normalized!,
      guardianName: gNameVal.normalized!,
      guardianRelation: body.guardianRelation ? String(body.guardianRelation).trim() : 'Father',
      guardianPhone: phoneVal.normalized!,
      guardianEmail: normalizedEmail,
      guardianCnic: cnicVal.normalized || '',
      scholarshipPercent: scholarshipVal.value,
      transportRouteId: body.transportRouteId || undefined,
      hostelRoomId: body.hostelRoomId || undefined,
      documents: Array.isArray(body.documents) ? body.documents : [],
      createdAt: new Date().toISOString(),
    };

    db.students.unshift(newStudent);

    // Automatically create Student ID Login account (default password Student@123 or custom)
    const rawPortalPwd = (req.body as any).portalPassword?.trim() || 'Student@123';
    db.users.push({
      id: `usr-std-${newStudent.id}`,
      loginId: newStudent.rollNo,
      name: newStudent.name,
      email: `${newStudent.rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.gbpskl.edu.pk`,
      passwordHash: bcrypt.hashSync(rawPortalPwd, 10),
      role: UserRole.STUDENT,
      phone: newStudent.guardianPhone,
      linkedStudentIds: [newStudent.id],
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Enrolled New Student',
      module: 'Student Management',
      details: `Admitted ${newStudent.name} (Student ID: ${newStudent.rollNo}) into ${cls.name}-${cls.section}.`,
      ipAddress: clientIp(req),
    });

    res.status(201).json({ student: newStudent });
  }
);

router.put(
  '/students/:id',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const idx = db.students.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Student record not found.' });
      return;
    }

    const updates = req.body as Partial<Student> & { portalPassword?: string };

    // Validate fields if provided in updates
    let updatedName = db.students[idx].name;
    if (updates.name !== undefined) {
      const nameVal = validateFullName(updates.name, 'Student Full Name');
      if (!nameVal.valid) {
        res.status(400).json({ error: nameVal.error });
        return;
      }
      updatedName = nameVal.normalized!;
    }

    let updatedGuardianName = db.students[idx].guardianName;
    if (updates.guardianName !== undefined) {
      const gNameVal = validateFullName(updates.guardianName, 'Guardian Name');
      if (!gNameVal.valid) {
        res.status(400).json({ error: gNameVal.error });
        return;
      }
      updatedGuardianName = gNameVal.normalized!;
    }

    let updatedPhone = db.students[idx].guardianPhone;
    if (updates.guardianPhone !== undefined) {
      const phoneVal = validatePhoneNumber(updates.guardianPhone, 'Guardian Phone');
      if (!phoneVal.valid) {
        res.status(400).json({ error: phoneVal.error });
        return;
      }
      updatedPhone = phoneVal.normalized!;
    }

    let updatedEmail = db.students[idx].guardianEmail;
    if (updates.guardianEmail !== undefined && String(updates.guardianEmail).trim()) {
      const emailVal = validateEmail(updates.guardianEmail, 'Guardian Email');
      if (!emailVal.valid) {
        res.status(400).json({ error: emailVal.error });
        return;
      }
      updatedEmail = emailVal.normalized!;
    }

    let updatedDob = db.students[idx].dob;
    if (updates.dob !== undefined) {
      const dobVal = validateDateOfBirth(updates.dob, 'STUDENT', 'Student Date of Birth');
      if (!dobVal.valid) {
        res.status(400).json({ error: dobVal.error });
        return;
      }
      updatedDob = dobVal.normalized!;
    }

    let updatedAddress = db.students[idx].address;
    if (updates.address !== undefined) {
      const addrVal = validateAddress(updates.address, 'Residential Address');
      if (!addrVal.valid) {
        res.status(400).json({ error: addrVal.error });
        return;
      }
      updatedAddress = addrVal.normalized!;
    }

    let updatedCnic = db.students[idx].guardianCnic;
    if (updates.guardianCnic !== undefined) {
      const cnicVal = validateCNIC(updates.guardianCnic, 'Guardian CNIC');
      if (!cnicVal.valid) {
        res.status(400).json({ error: cnicVal.error });
        return;
      }
      updatedCnic = cnicVal.normalized || '';
    }

    let updatedScholarship = db.students[idx].scholarshipPercent;
    if (updates.scholarshipPercent !== undefined) {
      const schVal = validatePercentage(updates.scholarshipPercent, 'Scholarship Percentage');
      if (!schVal.valid) {
        res.status(400).json({ error: schVal.error });
        return;
      }
      updatedScholarship = schVal.value;
    }

    const cls = updates.classId
      ? db.classes.find((c) => c.id === updates.classId)
      : db.classes.find((c) => c.id === db.students[idx].classId);

    const { portalPassword } = updates;

    db.students[idx] = {
      ...db.students[idx],
      ...updates,
      id: db.students[idx].id,
      name: updatedName,
      guardianName: updatedGuardianName,
      guardianPhone: updatedPhone,
      guardianEmail: updatedEmail,
      dob: updatedDob,
      address: updatedAddress,
      guardianCnic: updatedCnic,
      scholarshipPercent: updatedScholarship,
      section: cls ? cls.section : db.students[idx].section,
    };

    // Sync linked student user account (Student ID = Roll No & optional password update)
    db.users.forEach((u) => {
      if (u.role === UserRole.STUDENT && u.linkedStudentIds.includes(db.students[idx].id)) {
        u.name = db.students[idx].name;
        u.loginId = db.students[idx].rollNo;
        u.phone = db.students[idx].guardianPhone;
        u.isActive = db.students[idx].status === 'ACTIVE' || db.students[idx].status === 'PROMOTED';
        if (portalPassword && portalPassword.trim().length >= 4) {
          u.passwordHash = bcrypt.hashSync(portalPassword.trim(), 10);
        }
      }
    });

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Updated Student Profile',
      module: 'Student Management',
      details: `Updated record for ${db.students[idx].name} (Student ID: ${db.students[idx].rollNo}).`,
      ipAddress: clientIp(req),
    });

    res.json({ student: db.students[idx] });
  }
);

router.post(
  '/students/:id/promote',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const student = db.students.find((s) => s.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const { targetClassId, newRollNo } = req.body as { targetClassId?: string; newRollNo?: string };
    const targetClass = db.classes.find((c) => c.id === targetClassId);
    if (!targetClass) {
      res.status(400).json({ error: 'Valid target class is required for promotion.' });
      return;
    }

    student.classId = targetClass.id;
    student.section = targetClass.section;
    student.status = 'ACTIVE';
    if (newRollNo) student.rollNo = newRollNo.trim();

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Promoted / Reassigned Student',
      module: 'Student Management',
      details: `Promoted ${student.name} to ${targetClass.name}-${targetClass.section}.`,
      ipAddress: clientIp(req),
    });

    res.json({ student });
  }
);

router.post(
  '/students/:id/certificate',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const student = db.students.find((s) => s.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const { leavingType, reason, conduct } = req.body as {
      leavingType?: 'TRANSFER' | 'GRADUATION' | 'WITHDRAWAL';
      reason?: string;
      conduct?: string;
    };

    const cls = db.classes.find((c) => c.id === student.classId);
    student.status = leavingType === 'GRADUATION' ? 'ALUMNI' : 'TRANSFERRED';
    student.leavingCertificate = {
      certificateNo: `SLC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      issueDate: new Date().toISOString().slice(0, 10),
      leavingType: leavingType || 'TRANSFER',
      reason: reason || 'Relocation of family',
      conduct: conduct || 'Exemplary',
      lastClassAttended: cls ? `${cls.name} (${cls.section})` : student.section,
      issuedBy: req.user!.name,
    };

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Issued Leaving Certificate',
      module: 'Student Management',
      details: `Issued ${student.leavingCertificate.certificateNo} for ${student.name}.`,
      ipAddress: clientIp(req),
    });

    res.json({ student });
  }
);

// ============================================================================
// 5. MODULE 2: ATTENDANCE (Students & Staff + Auto Absence Parent Notification)
// ============================================================================
router.get('/attendance', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  const role = req.user!.role;

  let studentAtt = db.studentAttendance;
  if (role === UserRole.STUDENT || role === UserRole.PARENT) {
    studentAtt = studentAtt.filter((a) => req.user!.linkedStudentIds.includes(a.studentId));
  }

  res.json({
    studentAttendance: studentAtt,
    staffAttendance: db.staffAttendance,
  });
});

router.post(
  '/attendance/students',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { date, classId, records, autoNotifyParents } = req.body as {
      date?: string;
      classId?: string;
      autoNotifyParents?: boolean;
      records?: { studentId: string; status: AttendanceStatus; remarks?: string }[];
    };

    if (!date || !classId || !Array.isArray(records)) {
      res.status(400).json({ error: 'Date, classId, and attendance records array are required.' });
      return;
    }

    let notificationsDispatched = 0;

    for (const entry of records) {
      const existingIdx = db.studentAttendance.findIndex(
        (a) => a.studentId === entry.studentId && a.date === date
      );

      let notifiedParent = false;
      if (entry.status === 'ABSENT' && autoNotifyParents !== false) {
        const student = db.students.find((s) => s.id === entry.studentId);
        if (student) {
          notifiedParent = true;
          notificationsDispatched += 1;
          db.communicationLogs.unshift({
            id: uid('cml'),
            channel: 'SMS',
            recipientName: `${student.guardianName} (Guardian of ${student.name})`,
            recipientContact: student.guardianPhone,
            subject: 'Automated Absence Notification',
            message: `GBPS: Kando Lund Alert: ${student.name} (Roll ${student.rollNo}) was marked ABSENT on ${date}.${entry.remarks ? ` Note: ${entry.remarks}` : ''}`,
            status: 'DELIVERED',
            sentAt: new Date().toISOString(),
          });
        }
      }

      const recordObj = {
        id: existingIdx >= 0 ? db.studentAttendance[existingIdx].id : uid('att'),
        studentId: entry.studentId,
        classId,
        date,
        status: entry.status,
        remarks: entry.remarks || '',
        markedBy: req.user!.name,
        notifiedParent,
      };

      if (existingIdx >= 0) {
        db.studentAttendance[existingIdx] = recordObj;
      } else {
        db.studentAttendance.push(recordObj);
      }
    }

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Marked Student Attendance',
      module: 'Attendance',
      details: `Saved ${records.length} student attendance entries for ${date} (${notificationsDispatched} SMS alerts dispatched).`,
      ipAddress: clientIp(req),
    });

    res.json({
      studentAttendance: db.studentAttendance,
      notificationsDispatched,
    });
  }
);

router.post(
  '/attendance/staff',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { date, records } = req.body as {
      date?: string;
      records?: { staffId: string; status: AttendanceStatus; checkIn?: string; remarks?: string }[];
    };

    if (!date || !Array.isArray(records)) {
      res.status(400).json({ error: 'Date and staff attendance records are required.' });
      return;
    }

    for (const r of records) {
      const idx = db.staffAttendance.findIndex((a) => a.staffId === r.staffId && a.date === date);
      const item = {
        id: idx >= 0 ? db.staffAttendance[idx].id : uid('satt'),
        staffId: r.staffId,
        date,
        status: r.status,
        checkIn: r.checkIn || (r.status === 'PRESENT' ? '07:55' : ''),
        remarks: r.remarks || '',
      };
      if (idx >= 0) db.staffAttendance[idx] = item;
      else db.staffAttendance.push(item);
    }

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Marked Staff Attendance',
      module: 'Attendance',
      details: `Recorded staff attendance for ${date} (${records.length} employees).`,
      ipAddress: clientIp(req),
    });

    res.json({ staffAttendance: db.staffAttendance });
  }
);

// ============================================================================
// 6. MODULE 3: ACADEMICS (Classes, Subjects, Timetable, Homework, Syllabus)
// ============================================================================
router.get('/academics', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  res.json({
    classes: db.classes,
    subjects: db.subjects,
    timetable: db.timetable,
    homework: db.homework,
    syllabus: db.syllabus,
  });
});

router.post(
  '/academics/classes',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { name, section, roomNumber, classTeacherId, capacity } = req.body;
    if (!name || !section || !roomNumber) {
      res.status(400).json({ error: 'Class name, section, and room number are required.' });
      return;
    }

    const newCls = {
      id: uid('cls'),
      name: String(name).trim(),
      section: String(section).trim(),
      roomNumber: String(roomNumber).trim(),
      classTeacherId: classTeacherId || db.staff[0]?.id || '',
      capacity: Number(capacity) || 35,
    };
    db.classes.push(newCls);
    store.commit();
    res.status(201).json({ schoolClass: newCls });
  }
);

router.post(
  '/academics/subjects',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { code, name, classId, teacherId, totalMarks, passingMarks } = req.body;
    if (!code || !name || !classId) {
      res.status(400).json({ error: 'Subject code, name, and class are required.' });
      return;
    }

    const sub = {
      id: uid('sub'),
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      classId,
      teacherId: teacherId || db.staff[1]?.id || '',
      totalMarks: Number(totalMarks) || 100,
      passingMarks: Number(passingMarks) || 40,
    };
    db.subjects.push(sub);
    store.commit();
    res.status(201).json({ subject: sub });
  }
);

router.post(
  '/academics/timetable',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { classId, dayOfWeek, periodNo, startTime, endTime, subjectId, teacherId, room } = req.body;
    if (!classId || !dayOfWeek || !subjectId || !teacherId) {
      res.status(400).json({ error: 'Class, day, subject, and teacher are required.' });
      return;
    }

    const slot = {
      id: uid('tt'),
      classId,
      dayOfWeek,
      periodNo: Number(periodNo) || 1,
      startTime: startTime || '08:00',
      endTime: endTime || '08:50',
      subjectId,
      teacherId,
      room: room || 'R-201',
    };
    db.timetable.push(slot);
    store.commit();
    res.status(201).json({ slot });
  }
);

router.post(
  '/academics/homework',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { classId, subjectId, title, description, dueDate, maxMarks, attachmentName } = req.body;
    if (!classId || !subjectId || !title || !dueDate) {
      res.status(400).json({ error: 'Class, subject, title, and due date are required.' });
      return;
    }

    const hw = {
      id: uid('hw'),
      classId,
      subjectId,
      teacherId: req.user!.linkedStaffId || 'stf-02',
      title: String(title).trim(),
      description: String(description || '').trim(),
      dueDate,
      maxMarks: Number(maxMarks) || 20,
      attachmentName: attachmentName || undefined,
      submissions: [],
      createdAt: new Date().toISOString(),
    };
    db.homework.unshift(hw);
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Published Assignment',
      module: 'LMS Academics',
      details: `Posted assignment "${hw.title}" (${hw.maxMarks} marks) due ${hw.dueDate}.`,
      ipAddress: clientIp(req),
    });
    res.status(201).json({ homework: hw });
  }
);

router.post(
  '/academics/homework/:id/submit',
  authenticateToken,
  authorizeRoles(UserRole.STUDENT, UserRole.SUPER_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const hw = db.homework.find((h) => h.id === req.params.id);
    if (!hw) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    const { studentId, notes, attachmentName } = req.body as {
      studentId?: string;
      notes?: string;
      attachmentName?: string;
    };
    const resolvedStudentId =
      req.user!.role === UserRole.STUDENT
        ? req.user!.linkedStudentIds[0]
        : studentId || req.user!.linkedStudentIds[0];

    const student = db.students.find((s) => s.id === resolvedStudentId);
    if (!student) {
      res.status(400).json({ error: 'Valid student profile required for submission.' });
      return;
    }

    const existingIdx = hw.submissions.findIndex((s) => s.studentId === student.id);
    const prev = existingIdx >= 0 ? hw.submissions[existingIdx] : undefined;

    const submission = {
      studentId: student.id,
      studentName: student.name,
      submittedAt: new Date().toISOString(),
      notes: notes || 'Submitted assignment via Student LMS Portal.',
      attachmentName: attachmentName || `${student.rollNo}_assignment.pdf`,
      status: prev?.status === 'GRADED' ? ('GRADED' as const) : ('SUBMITTED' as const),
      marks: prev?.marks,
      feedback: prev?.feedback,
      gradedBy: prev?.gradedBy,
      gradedAt: prev?.gradedAt,
    };

    if (existingIdx >= 0) hw.submissions[existingIdx] = submission;
    else hw.submissions.push(submission);

    store.commit();
    res.json({ homework: hw });
  }
);

router.post(
  '/academics/syllabus',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { classId, subjectId, term, unitTitle, topics, completionPercent, targetDate } = req.body;
    if (!classId || !subjectId || !unitTitle) {
      res.status(400).json({ error: 'Class, subject, and unit title are required.' });
      return;
    }
    const plan = {
      id: uid('syl'),
      classId,
      subjectId,
      term: term || 'Autumn Term 2026',
      unitTitle: String(unitTitle).trim(),
      topics: String(topics || '').trim(),
      completionPercent: Math.min(100, Math.max(0, Number(completionPercent) || 0)),
      targetDate: targetDate || '2026-11-30',
    };
    db.syllabus.unshift(plan);
    store.commit();
    res.status(201).json({ plan });
  }
);

router.put(
  '/academics/syllabus/:id',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const plan = db.syllabus.find((p) => p.id === req.params.id);
    if (!plan) {
      res.status(404).json({ error: 'Syllabus plan not found.' });
      return;
    }
    if (req.body.completionPercent !== undefined) {
      plan.completionPercent = Math.min(100, Math.max(0, Number(req.body.completionPercent)));
    }
    store.commit();
    res.json({ plan });
  }
);

// ============================================================================
// 7. MODULE 4: EXAMS & RESULTS (Auto Total, %, Grade, GPA & Class Position)
// ============================================================================
router.get('/exams', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();

  // Compute class standings per exam & class automatically
  const standingsByExamClass: Record<
    string,
    {
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
    }[]
  > = {};

  for (const exam of db.exams) {
    for (const cls of db.classes) {
      const classStudents = db.students.filter((s) => s.classId === cls.id);
      const classSubjects = db.subjects.filter((sub) => sub.classId === cls.id);
      if (classStudents.length === 0 || classSubjects.length === 0) continue;

      const rawRows = classStudents
        .map((st) => {
          const stMarks = db.examMarks.filter(
            (m) => m.examId === exam.id && m.studentId === st.id
          );
          if (stMarks.length === 0) return null;

          const breakdown = stMarks.map((m) => {
            const sub = db.subjects.find((s) => s.id === m.subjectId);
            const pct = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
            return {
              subjectId: m.subjectId,
              subjectCode: sub?.code || 'SUB',
              subjectName: sub?.name || 'Subject',
              marksObtained: m.marksObtained,
              maxMarks: m.maxMarks,
              grade: calculateGradeInfo(pct).grade,
              remarks: m.remarks || calculateGradeInfo(pct).remarks,
            };
          });

          const totalObtained = breakdown.reduce((s, b) => s + b.marksObtained, 0);
          const totalMax = breakdown.reduce((s, b) => s + b.maxMarks, 0);
          const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;
          const info = calculateGradeInfo(percentage);

          return {
            studentId: st.id,
            studentName: st.name,
            rollNo: st.rollNo,
            classId: cls.id,
            totalObtained,
            totalMax,
            percentage,
            grade: info.grade,
            gpa: info.gpa,
            position: 1,
            subjectBreakdown: breakdown,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.percentage - a.percentage);

      rawRows.forEach((row, index) => {
        row.position = index + 1;
      });

      const role = req.user!.role;
      const filteredRows =
        role === UserRole.STUDENT || role === UserRole.PARENT
          ? rawRows.filter((r) => req.user!.linkedStudentIds.includes(r.studentId))
          : rawRows;

      standingsByExamClass[`${exam.id}::${cls.id}`] = filteredRows;
    }
  }

  res.json({
    exams: db.exams,
    examMarks: db.examMarks,
    standingsByExamClass,
  });
});

router.post(
  '/exams',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { name, term, academicYear, startDate, endDate, status, datesheet } = req.body;
    if (!name || !startDate || !endDate) {
      res.status(400).json({ error: 'Exam name, start date, and end date are required.' });
      return;
    }
    const exam = {
      id: uid('exm'),
      name: String(name).trim(),
      term: term || 'Spring Term',
      academicYear: academicYear || '2026-2027',
      startDate,
      endDate,
      status: status || 'SCHEDULED',
      datesheet: Array.isArray(datesheet) ? datesheet : [],
    };
    db.exams.unshift(exam);
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Scheduled Examination',
      module: 'Exams & Results',
      details: `Created "${exam.name}" (${exam.startDate} to ${exam.endDate}).`,
      ipAddress: clientIp(req),
    });
    res.status(201).json({ exam });
  }
);

router.post(
  '/exams/marks',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { examId, subjectId, entries } = req.body as {
      examId?: string;
      subjectId?: string;
      entries?: { studentId: string; marksObtained: number; maxMarks?: number; remarks?: string }[];
    };

    if (!examId || !subjectId || !Array.isArray(entries)) {
      res.status(400).json({ error: 'examId, subjectId, and entries list are required.' });
      return;
    }

    for (const entry of entries) {
      const maxMarks = Number(entry.maxMarks) || 100;
      const obtained = Math.min(maxMarks, Math.max(0, Number(entry.marksObtained) || 0));

      const idx = db.examMarks.findIndex(
        (m) =>
          m.examId === examId &&
          m.studentId === entry.studentId &&
          m.subjectId === subjectId
      );

      const markRecord = {
        id: idx >= 0 ? db.examMarks[idx].id : uid('mk'),
        examId,
        studentId: entry.studentId,
        subjectId,
        marksObtained: obtained,
        maxMarks,
        remarks: entry.remarks || '',
      };

      if (idx >= 0) db.examMarks[idx] = markRecord;
      else db.examMarks.push(markRecord);
    }

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Entered Exam Marks',
      module: 'Exams & Results',
      details: `Saved marks for ${entries.length} students in subject ${subjectId}.`,
      ipAddress: clientIp(req),
    });

    res.json({ examMarks: db.examMarks });
  }
);

// ============================================================================
// 8. MODULE 5: FEE MANAGEMENT (Structures, Vouchers, Discounts, Gateways)
// ============================================================================
router.get('/fees', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  const role = req.user!.role;

  let vouchers = db.feeVouchers;
  if (role === UserRole.STUDENT || role === UserRole.PARENT) {
    vouchers = vouchers.filter((v) => req.user!.linkedStudentIds.includes(v.studentId));
  }

  res.json({
    feeStructures: db.feeStructures,
    feeVouchers: vouchers,
  });
});

router.post(
  '/fees/structures',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { classId, tuitionFee, labFee, libraryFee, examFee, lateFinePerDay } = req.body;
    if (!classId || tuitionFee === undefined) {
      res.status(400).json({ error: 'Class and tuition fee are required.' });
      return;
    }

    const idx = db.feeStructures.findIndex((f) => f.classId === classId);
    const record = {
      id: idx >= 0 ? db.feeStructures[idx].id : uid('fs'),
      classId,
      tuitionFee: Number(tuitionFee) || 0,
      labFee: Number(labFee) || 0,
      libraryFee: Number(libraryFee) || 0,
      examFee: Number(examFee) || 0,
      lateFinePerDay: Number(lateFinePerDay) || 100,
    };

    if (idx >= 0) db.feeStructures[idx] = record;
    else db.feeStructures.push(record);

    store.commit();
    res.json({ feeStructure: record });
  }
);

router.post(
  '/fees/vouchers',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { studentId, billingMonth, dueDate, lateFine, extraDiscount } = req.body;
    const student = db.students.find((s) => s.id === studentId);
    if (!student || !billingMonth || !dueDate) {
      res.status(400).json({ error: 'Valid student, billing month, and due date are required.' });
      return;
    }

    const fs = db.feeStructures.find((f) => f.classId === student.classId);
    const baseAmount = fs
      ? fs.tuitionFee + fs.labFee + fs.libraryFee + fs.examFee
      : 20000;
    const trp = student.transportRouteId
      ? db.transportRoutes.find((r) => r.id === student.transportRouteId)?.monthlyFee || 0
      : 0;
    const hst = student.hostelRoomId
      ? db.hostelRooms.find((h) => h.id === student.hostelRoomId)?.monthlyFee || 0
      : 0;

    const scholarshipDiscount = Math.round((baseAmount * (student.scholarshipPercent || 0)) / 100);
    const discountAmount = scholarshipDiscount + (Number(extraDiscount) || 0);
    const fine = Number(lateFine) || 0;
    const netAmount = Math.max(0, baseAmount + trp + hst - discountAmount + fine);

    const voucher = {
      id: uid('vch'),
      voucherNo: `VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: student.id,
      classId: student.classId,
      billingMonth: String(billingMonth).trim(),
      dueDate,
      baseAmount,
      transportFee: trp,
      hostelFee: hst,
      discountAmount,
      lateFine: fine,
      netAmount,
      paidAmount: 0,
      status: 'UNPAID' as const,
    };

    db.feeVouchers.unshift(voucher);
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Generated Fee Voucher',
      module: 'Fee Management',
      details: `Issued ${voucher.voucherNo} (${voucher.billingMonth}) for ${student.name} — Net PKR ${netAmount.toLocaleString()}.`,
      ipAddress: clientIp(req),
    });

    res.status(201).json({ voucher });
  }
);

router.post(
  '/fees/vouchers/:id/pay',
  authenticateToken,
  authorizeRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.PARENT,
    UserRole.STUDENT
  ),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const voucher = db.feeVouchers.find((v) => v.id === req.params.id);
    if (!voucher) {
      res.status(404).json({ error: 'Fee voucher not found.' });
      return;
    }

    // Ensure student/parent only pays their own linked student voucher
    if (
      (req.user!.role === UserRole.STUDENT || req.user!.role === UserRole.PARENT) &&
      !req.user!.linkedStudentIds.includes(voucher.studentId)
    ) {
      res.status(403).json({ error: 'Unauthorized to pay this voucher.' });
      return;
    }

    const { amount, paymentMethod, paymentReference } = req.body as {
      amount?: number;
      paymentMethod?: 'Cash' | 'JazzCash' | 'Easypaisa' | 'Bank Transfer';
      paymentReference?: string;
    };

    const payAmt = Number(amount) || voucher.netAmount - voucher.paidAmount;
    voucher.paidAmount = Math.min(voucher.netAmount, voucher.paidAmount + payAmt);
    voucher.paymentMethod = paymentMethod || 'JazzCash';
    voucher.paymentReference =
      paymentReference?.trim() ||
      `${(paymentMethod || 'JC').slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-8)}`;
    voucher.paidAt = new Date().toISOString();
    voucher.status = voucher.paidAmount >= voucher.netAmount ? 'PAID' : 'PARTIAL';

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Fee Payment Recorded',
      module: 'Fee Management',
      details: `Received PKR ${payAmt.toLocaleString()} via ${voucher.paymentMethod} (${voucher.paymentReference}) for ${voucher.voucherNo}.`,
      ipAddress: clientIp(req),
    });

    res.json({ voucher });
  }
);

// ============================================================================
// 9. MODULE 6: STAFF & HR (Staff Records, Payroll & Payslips, Leave Workflow)
// ============================================================================
router.get('/staff', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  res.json({
    staff: db.staff,
    payroll: db.payroll,
    leaveRequests: db.leaveRequests,
  });
});

router.post(
  '/staff',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { name, email, phone, designation, department, qualification, baseSalary, allowances } = req.body;

    const nameVal = validateFullName(name, 'Staff Full Name');
    if (!nameVal.valid) {
      res.status(400).json({ error: nameVal.error });
      return;
    }

    const emailVal = validateEmail(email, 'Official Staff Email');
    if (!emailVal.valid) {
      res.status(400).json({ error: emailVal.error });
      return;
    }

    // Check duplicate email across users and staff
    const emailNorm = emailVal.normalized!;
    if (db.staff.some((s) => s.email.toLowerCase() === emailNorm)) {
      res.status(409).json({ error: `A staff member with email '${emailNorm}' already exists.` });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === emailNorm)) {
      res.status(409).json({ error: `An account with email '${emailNorm}' already exists.` });
      return;
    }

    const phoneVal = validatePhoneNumber(phone || '+923000000000', 'Phone Number');
    if (!phoneVal.valid) {
      res.status(400).json({ error: phoneVal.error });
      return;
    }

    const desig = String(designation || '').trim();
    if (desig.length < 2) {
      res.status(400).json({ error: 'Designation must be at least 2 characters long.' });
      return;
    }

    const baseSalVal = validatePositiveAmount(baseSalary ?? 90000, 'Base Salary');
    if (!baseSalVal.valid) {
      res.status(400).json({ error: baseSalVal.error });
      return;
    }

    const allowVal = validatePositiveAmount(allowances ?? 10000, 'Allowances');
    if (!allowVal.valid) {
      res.status(400).json({ error: allowVal.error });
      return;
    }

    const member = {
      id: uid('stf'),
      employeeCode: `EMP-${1001 + db.staff.length}`,
      name: nameVal.normalized!,
      email: emailNorm,
      phone: phoneVal.normalized!,
      designation: desig,
      department: String(department || 'Academics').trim(),
      qualification: String(qualification || 'M.Sc / B.Ed').trim(),
      joinDate: new Date().toISOString().slice(0, 10),
      baseSalary: baseSalVal.value,
      allowances: allowVal.value,
      status: 'ACTIVE' as const,
    };

    db.staff.push(member);

    // Automatically create Teacher LMS Portal account
    db.users.push({
      id: `usr-tchr-${member.id}`,
      loginId: member.employeeCode,
      name: member.name,
      email: member.email,
      passwordHash: bcrypt.hashSync('Teacher@123', 10),
      role: UserRole.TEACHER,
      phone: member.phone,
      linkedStudentIds: [],
      linkedStaffId: member.id,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Added Staff Member',
      module: 'Staff & HR',
      details: `Onboarded ${member.name} (${member.employeeCode}) as ${member.designation}.`,
      ipAddress: clientIp(req),
    });

    res.status(201).json({ staffMember: member });
  }
);

router.put(
  '/staff/:id',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const idx = db.staff.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const body = req.body;
    const existing = db.staff[idx];

    let updatedName = existing.name;
    if (body.name !== undefined) {
      const nameVal = validateFullName(body.name, 'Staff Full Name');
      if (!nameVal.valid) {
        res.status(400).json({ error: nameVal.error });
        return;
      }
      updatedName = nameVal.normalized!;
    }

    let updatedEmail = existing.email;
    if (body.email !== undefined) {
      const emailVal = validateEmail(body.email, 'Official Staff Email');
      if (!emailVal.valid) {
        res.status(400).json({ error: emailVal.error });
        return;
      }
      const emailNorm = emailVal.normalized!;
      // Prevent duplicate if changing email
      if (
        emailNorm !== existing.email.toLowerCase() &&
        db.staff.some((s) => s.id !== existing.id && s.email.toLowerCase() === emailNorm)
      ) {
        res.status(409).json({ error: `Email '${emailNorm}' is already in use by another staff member.` });
        return;
      }
      updatedEmail = emailNorm;
    }

    let updatedPhone = existing.phone;
    if (body.phone !== undefined) {
      const phoneVal = validatePhoneNumber(body.phone, 'Phone Number');
      if (!phoneVal.valid) {
        res.status(400).json({ error: phoneVal.error });
        return;
      }
      updatedPhone = phoneVal.normalized!;
    }

    const updatedBaseSalary =
      body.baseSalary !== undefined ? Number(body.baseSalary) || 0 : existing.baseSalary;
    const updatedAllowances =
      body.allowances !== undefined ? Number(body.allowances) || 0 : existing.allowances;
    const validStatus =
      body.status === 'ON_LEAVE' || body.status === 'RESIGNED' ? body.status : 'ACTIVE';

    const updated = {
      ...existing,
      employeeCode: body.employeeCode ? String(body.employeeCode).trim() : existing.employeeCode,
      name: updatedName,
      email: updatedEmail,
      phone: updatedPhone,
      designation: body.designation ? String(body.designation).trim() : existing.designation,
      department: body.department !== undefined ? String(body.department).trim() : existing.department,
      qualification:
        body.qualification !== undefined ? String(body.qualification).trim() : existing.qualification,
      joinDate: body.joinDate || existing.joinDate,
      baseSalary: Math.max(0, updatedBaseSalary),
      allowances: Math.max(0, updatedAllowances),
      status: validStatus as 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED',
    };

    db.staff[idx] = updated;

    // Sync pending payroll records with updated salary & allowances
    db.payroll.forEach((p) => {
      if (p.staffId === updated.id && p.status === 'PENDING') {
        p.baseSalary = updated.baseSalary;
        p.allowances = updated.allowances;
        p.netSalary = Math.max(0, updated.baseSalary + updated.allowances - p.deductions);
      }
    });

    // Sync linked RBAC user account if present
    db.users.forEach((u) => {
      if (u.linkedStaffId === updated.id) {
        u.name = updated.name;
        u.email = updated.email;
        u.phone = updated.phone;
        u.loginId = updated.employeeCode;
        u.isActive = updated.status !== 'RESIGNED';
      }
    });

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Updated Staff Profile',
      module: 'Staff & HR',
      details: `Updated record for ${updated.name} (${updated.employeeCode} · ${updated.designation}).`,
      ipAddress: clientIp(req),
    });

    res.json({ staffMember: updated, payroll: db.payroll });
  }
);

router.post(
  '/staff/payroll/:id/pay',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const rec = db.payroll.find((p) => p.id === req.params.id);
    if (!rec) {
      res.status(404).json({ error: 'Payroll entry not found.' });
      return;
    }
    rec.status = 'PAID';
    rec.paidOn = new Date().toISOString().slice(0, 10);

    const emp = db.staff.find((s) => s.id === rec.staffId);
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Disbursed Payroll',
      module: 'Staff & HR',
      details: `Disbursed ${rec.month} salary (PKR ${rec.netSalary.toLocaleString()}) to ${emp?.name || rec.staffId}.`,
      ipAddress: clientIp(req),
    });

    res.json({ payrollRecord: rec });
  }
);

router.post(
  '/staff/leaves',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { staffId, leaveType, fromDate, toDate, reason } = req.body;
    const resolvedStaffId = staffId || req.user!.linkedStaffId || db.staff[1]?.id;
    if (!resolvedStaffId || !fromDate || !toDate || !reason) {
      res.status(400).json({ error: 'Leave dates and reason are required.' });
      return;
    }

    const lv = {
      id: uid('lv'),
      staffId: resolvedStaffId,
      leaveType: leaveType || 'Casual Leave',
      fromDate,
      toDate,
      reason: String(reason).trim(),
      status: 'PENDING' as const,
    };
    db.leaveRequests.unshift(lv);
    store.commit();
    res.status(201).json({ leaveRequest: lv });
  }
);

router.put(
  '/staff/leaves/:id/status',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const lv = db.leaveRequests.find((l) => l.id === req.params.id);
    if (!lv) {
      res.status(404).json({ error: 'Leave request not found.' });
      return;
    }
    const { status } = req.body as { status?: 'APPROVED' | 'REJECTED' };
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }
    lv.status = status;
    lv.reviewedBy = req.user!.name;
    store.commit();
    res.json({ leaveRequest: lv });
  }
);

// ============================================================================
// 10. MODULE 7: COMMUNICATION (Notices, SMS/WhatsApp/Email, PTM)
// ============================================================================
router.get('/communication', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  res.json({
    notices: db.notices,
    communicationLogs: db.communicationLogs,
    ptmSchedules: db.ptmSchedules,
  });
});

router.post(
  '/communication/notices',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { title, content, audience, category } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Notice title and content are required.' });
      return;
    }
    const notice = {
      id: uid('ntc'),
      title: String(title).trim(),
      content: String(content).trim(),
      audience: audience || 'ALL',
      category: category || 'Academic',
      publishedBy: req.user!.name,
      publishDate: new Date().toISOString().slice(0, 10),
    };
    db.notices.unshift(notice);
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Published Notice',
      module: 'Communication',
      details: `Posted notice "${notice.title}" for ${notice.audience}.`,
      ipAddress: clientIp(req),
    });
    res.status(201).json({ notice });
  }
);

router.post(
  '/communication/messages',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { channel, recipientName, recipientContact, subject, message } = req.body;
    if (!channel || !recipientContact || !message) {
      res.status(400).json({ error: 'Channel, recipient contact, and message are required.' });
      return;
    }

    const contactStr = String(recipientContact).trim();
    let validatedContact = contactStr;

    if (channel === 'EMAIL') {
      const emailVal = validateEmail(contactStr, 'Recipient Email');
      if (!emailVal.valid) {
        res.status(400).json({ error: emailVal.error });
        return;
      }
      validatedContact = emailVal.normalized!;
    } else {
      // SMS or WHATSAPP
      const phoneVal = validatePhoneNumber(contactStr, 'Recipient Phone Number');
      if (!phoneVal.valid) {
        res.status(400).json({ error: phoneVal.error });
        return;
      }
      validatedContact = phoneVal.normalized!;
    }

    const recName = recipientName ? String(recipientName).trim() : 'Parent / Guardian';
    const subj = subject ? String(subject).trim() : 'School Notification';
    const msgText = String(message).trim();

    if (msgText.length < 2) {
      res.status(400).json({ error: 'Message body cannot be empty.' });
      return;
    }

    const log = {
      id: uid('cml'),
      channel,
      recipientName: recName,
      recipientContact: validatedContact,
      subject: subj,
      message: msgText,
      status: 'DELIVERED' as const,
      sentAt: new Date().toISOString(),
    };
    db.communicationLogs.unshift(log);
    store.commit();
    res.status(201).json({ log });
  }
);

router.post(
  '/communication/ptm',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { title, date, timeSlot, classId, teacherId, room, notes } = req.body;
    if (!title || !date || !timeSlot) {
      res.status(400).json({ error: 'Meeting title, date, and time slot are required.' });
      return;
    }
    const ptm = {
      id: uid('ptm'),
      title: String(title).trim(),
      date,
      timeSlot: String(timeSlot).trim(),
      classId: classId || db.classes[0]?.id || '',
      teacherId: teacherId || req.user!.linkedStaffId || db.staff[1]?.id || '',
      room: String(room || 'R-201').trim(),
      notes: String(notes || '').trim(),
    };
    db.ptmSchedules.unshift(ptm);
    store.commit();
    res.status(201).json({ ptm });
  }
);

// ============================================================================
// 11. MODULE 9: CAMPUS OPERATIONS (Library, Transport, Hostel, Inventory)
// ============================================================================
router.get('/operations', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  res.json({
    libraryBooks: db.libraryBooks,
    libraryIssues: db.libraryIssues,
    transportRoutes: db.transportRoutes,
    hostelRooms: db.hostelRooms,
    inventory: db.inventory,
  });
});

router.post(
  '/operations/library/books',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { isbn, title, author, category, totalCopies, shelfLocation } = req.body;
    if (!title || !author) {
      res.status(400).json({ error: 'Book title and author are required.' });
      return;
    }
    const copies = Number(totalCopies) || 5;
    const book = {
      id: uid('bk'),
      isbn: String(isbn || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`).trim(),
      title: String(title).trim(),
      author: String(author).trim(),
      category: String(category || 'General').trim(),
      totalCopies: copies,
      availableCopies: copies,
      shelfLocation: String(shelfLocation || 'A-01').trim(),
    };
    db.libraryBooks.unshift(book);
    store.commit();
    res.status(201).json({ book });
  }
);

router.post(
  '/operations/library/issues',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { bookId, studentId, dueDate } = req.body;
    const book = db.libraryBooks.find((b) => b.id === bookId);
    const student = db.students.find((s) => s.id === studentId);
    if (!book || !student || !dueDate) {
      res.status(400).json({ error: 'Valid book, student, and due date are required.' });
      return;
    }
    if (book.availableCopies <= 0) {
      res.status(400).json({ error: 'No available copies on shelf.' });
      return;
    }
    book.availableCopies -= 1;
    const issue = {
      id: uid('iss'),
      bookId: book.id,
      studentId: student.id,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate,
      fineAmount: 0,
      status: 'ISSUED' as const,
    };
    db.libraryIssues.unshift(issue);
    store.commit();
    res.status(201).json({ issue, book });
  }
);

router.put(
  '/operations/library/issues/:id/return',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const issue = db.libraryIssues.find((i) => i.id === req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue record not found.' });
      return;
    }
    if (issue.status !== 'RETURNED') {
      issue.status = 'RETURNED';
      issue.returnDate = new Date().toISOString().slice(0, 10);
      if (req.body.fineAmount !== undefined) {
        issue.fineAmount = Number(req.body.fineAmount) || 0;
      }
      const book = db.libraryBooks.find((b) => b.id === issue.bookId);
      if (book) book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      store.commit();
    }
    res.json({ issue });
  }
);

router.post(
  '/operations/transport',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { routeCode, routeName, stops, vehicleNo, driverName, driverPhone, monthlyFee, capacity } = req.body;
    if (!routeName || !vehicleNo || !driverName) {
      res.status(400).json({ error: 'Route name, vehicle number, and driver name are required.' });
      return;
    }

    const driverNameVal = validateFullName(driverName, 'Driver Name');
    if (!driverNameVal.valid) {
      res.status(400).json({ error: driverNameVal.error });
      return;
    }

    const driverPhoneVal = validatePhoneNumber(driverPhone || '+923000000000', 'Driver Phone');
    if (!driverPhoneVal.valid) {
      res.status(400).json({ error: driverPhoneVal.error });
      return;
    }

    const feeVal = validatePositiveAmount(monthlyFee ?? 4500, 'Monthly Route Fee');
    if (!feeVal.valid) {
      res.status(400).json({ error: feeVal.error });
      return;
    }

    const route = {
      id: uid('trp'),
      routeCode: String(routeCode || `RT-0${db.transportRoutes.length + 1}`).trim(),
      routeName: String(routeName).trim(),
      stops: String(stops || 'Campus Main Gate').trim(),
      vehicleNo: String(vehicleNo).trim(),
      driverName: driverNameVal.normalized!,
      driverPhone: driverPhoneVal.normalized!,
      monthlyFee: feeVal.value,
      capacity: Math.max(1, Number(capacity) || 25),
    };
    db.transportRoutes.push(route);
    store.commit();
    res.status(201).json({ route });
  }
);

router.post(
  '/operations/hostel',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { blockName, roomNo, roomType, capacity, monthlyFee, wardenName } = req.body;
    if (!blockName || !roomNo) {
      res.status(400).json({ error: 'Block name and room number are required.' });
      return;
    }

    let normalizedWarden = 'Campus Warden';
    if (wardenName && String(wardenName).trim()) {
      const wardenVal = validateFullName(wardenName, 'Warden Name');
      if (!wardenVal.valid) {
        res.status(400).json({ error: wardenVal.error });
        return;
      }
      normalizedWarden = wardenVal.normalized!;
    }

    const feeVal = validatePositiveAmount(monthlyFee ?? 13500, 'Hostel Room Fee');
    if (!feeVal.valid) {
      res.status(400).json({ error: feeVal.error });
      return;
    }

    const room = {
      id: uid('hst'),
      blockName: String(blockName).trim(),
      roomNo: String(roomNo).trim(),
      roomType: roomType || 'Twin Sharing',
      capacity: Math.max(1, Number(capacity) || 2),
      monthlyFee: feeVal.value,
      wardenName: normalizedWarden,
    };
    db.hostelRooms.push(room);
    store.commit();
    res.status(201).json({ room });
  }
);

router.post(
  '/operations/inventory',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { itemCode, name, category, quantity, minThreshold, unit, location } = req.body;
    if (!name || quantity === undefined) {
      res.status(400).json({ error: 'Item name and stock quantity are required.' });
      return;
    }
    const item = {
      id: uid('inv'),
      itemCode: String(itemCode || `STK-${Math.floor(100 + Math.random() * 900)}`).trim(),
      name: String(name).trim(),
      category: category || 'Stationery',
      quantity: Number(quantity) || 0,
      minThreshold: Number(minThreshold) || 10,
      unit: String(unit || 'Units').trim(),
      location: String(location || 'Central Store').trim(),
      lastRestocked: new Date().toISOString().slice(0, 10),
    };
    db.inventory.unshift(item);
    store.commit();
    res.status(201).json({ item });
  }
);

router.put(
  '/operations/inventory/:id',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const item = db.inventory.find((i) => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }
    item.quantity = Math.max(0, Number(req.body.quantity ?? item.quantity));
    item.lastRestocked = new Date().toISOString().slice(0, 10);
    store.commit();
    res.json({ item });
  }
);

// ============================================================================
// 12. MODULE 10: SECURITY, AUDIT LOGS & DATA BACKUP / RESTORE
// ============================================================================
router.get(
  '/security/logs',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (_req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    res.json({
      logs: db.activityLogs,
      users: db.users.map(({ passwordHash: _p, ...safe }) => safe),
    });
  }
);

router.get(
  '/security/backup',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Exported Database Backup',
      module: 'Security & Backup',
      details: 'Downloaded full encrypted-ready JSON snapshot of institutional tables.',
      ipAddress: clientIp(req),
    });
    res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      snapshot: store.getState(),
    });
  }
);

router.post(
  '/security/restore',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const { snapshot } = req.body as { snapshot?: DatabaseSchema };
    if (!snapshot || !Array.isArray(snapshot.users) || !Array.isArray(snapshot.students)) {
      res.status(400).json({ error: 'Invalid database backup file structure.' });
      return;
    }
    store.restoreSnapshot(snapshot);
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Restored Database Backup',
      module: 'Security & Backup',
      details: 'Restored relational database state from uploaded backup snapshot.',
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  }
);

router.post(
  '/security/reset-seed',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    store.resetToSeed();
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Reset Demo Seed Data',
      module: 'Security & Backup',
      details: 'Re-initialized database to clean demo state.',
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  }
);

// ============================================================================
// 13. LMS MODULE (Student Limited Portal + Teacher Portal + Super Admin Control)
// ============================================================================
router.get('/lms', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = store.getState();
  const role = req.user!.role;

  if (role === UserRole.STUDENT) {
    const myStudent = db.students.find((s) => req.user!.linkedStudentIds.includes(s.id));
    if (!myStudent) {
      res.status(404).json({ error: 'Linked student profile not found.' });
      return;
    }

    const myClassLectures = (db.lectures || []).filter((l) => l.classId === myStudent.classId);
    const myClassAssignments = db.homework
      .filter((h) => h.classId === myStudent.classId)
      .map((h) => ({
        ...h,
        submissions: h.submissions.filter((sub) => sub.studentId === myStudent.id),
      }));

    const myClassQuizzes = (db.quizzes || [])
      .filter((q) => q.classId === myStudent.classId)
      .map((q) => {
        const myAttempts = q.attempts.filter((a) => a.studentId === myStudent.id);
        const hasAttempted = myAttempts.length > 0;
        return {
          ...q,
          attempts: myAttempts,
          questions: q.questions.map((ques) => ({
            ...ques,
            // Hide correctOptionIndex until student submits their quiz attempt
            correctOptionIndex: hasAttempted ? ques.correctOptionIndex : -1,
          })),
        };
      });

    const myAttendance = db.studentAttendance.filter((a) => a.studentId === myStudent.id);
    const myNotices = db.notices.filter(
      (n) => n.audience === 'ALL' || n.audience === 'STUDENTS'
    );

    res.json({
      students: [myStudent],
      classes: db.classes.filter((c) => c.id === myStudent.classId),
      subjects: db.subjects.filter((s) => s.classId === myStudent.classId),
      lectures: myClassLectures,
      assignments: myClassAssignments,
      quizzes: myClassQuizzes,
      attendance: myAttendance,
      notices: myNotices,
    });
    return;
  }

  // TEACHER & SUPER_ADMIN get full LMS datasets to manage classes, check results, & update attendance
  res.json({
    students: db.students,
    classes: db.classes,
    subjects: db.subjects,
    staff: db.staff,
    lectures: db.lectures || [],
    assignments: db.homework,
    quizzes: db.quizzes || [],
    attendance: db.studentAttendance,
    notices: db.notices,
  });
});

router.post(
  '/lms/lectures',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { classId, subjectId, title, topic, durationMins, videoUrl, notes } = req.body;
    if (!classId || !subjectId || !title || !notes) {
      res.status(400).json({ error: 'Class, subject, lecture title, and notes are required.' });
      return;
    }

    const lecture = {
      id: uid('lec'),
      classId,
      subjectId,
      teacherId: req.user!.linkedStaffId || 'stf-02',
      teacherName: req.user!.name,
      title: String(title).trim(),
      topic: String(topic || 'Course Module').trim(),
      durationMins: Number(durationMins) || 35,
      videoUrl: videoUrl ? String(videoUrl).trim() : undefined,
      notes: String(notes).trim(),
      completedStudentIds: [],
      publishedAt: new Date().toISOString().slice(0, 10),
    };

    if (!Array.isArray(db.lectures)) db.lectures = [];
    db.lectures.unshift(lecture);

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Published LMS Lecture',
      module: 'LMS Portal',
      details: `Uploaded lecture "${lecture.title}" for class ${classId}.`,
      ipAddress: clientIp(req),
    });

    res.status(201).json({ lecture });
  }
);

router.delete(
  '/lms/lectures/:id',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const idx = (db.lectures || []).findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Lecture not found.' });
      return;
    }
    const removed = db.lectures.splice(idx, 1)[0];
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Removed LMS Lecture',
      module: 'LMS Portal',
      details: `Deleted lecture "${removed.title}".`,
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  }
);

router.post(
  '/lms/lectures/:id/complete',
  authenticateToken,
  authorizeRoles(UserRole.STUDENT, UserRole.SUPER_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const lecture = (db.lectures || []).find((l) => l.id === req.params.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found.' });
      return;
    }

    const studentId =
      req.user!.role === UserRole.STUDENT
        ? req.user!.linkedStudentIds[0]
        : (req.body.studentId as string) || req.user!.linkedStudentIds[0];

    if (!studentId) {
      res.status(400).json({ error: 'Student ID required.' });
      return;
    }

    const idx = lecture.completedStudentIds.indexOf(studentId);
    if (idx >= 0) {
      lecture.completedStudentIds.splice(idx, 1);
    } else {
      lecture.completedStudentIds.push(studentId);
    }

    store.commit();
    res.json({ lecture });
  }
);

router.post(
  '/lms/quizzes',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const { classId, subjectId, title, instructions, durationMins, dueDate, questions } = req.body;

    if (!classId || !subjectId || !title || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Class, subject, quiz title, and at least 1 MCQ question are required.' });
      return;
    }

    const normalizedQuestions: LmsQuizQuestion[] = (questions as Array<{
      questionText?: string;
      options?: string[];
      correctOptionIndex?: number;
      marks?: number;
    }>).map((q, idx: number) => ({
      id: uid(`q${idx + 1}`),
      questionText: String(q.questionText || '').trim(),
      options: Array.isArray(q.options) ? q.options.map((o: unknown) => String(o).trim()) : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: Math.min(3, Math.max(0, Number(q.correctOptionIndex) || 0)),
      marks: Math.max(1, Number(q.marks) || 5),
    }));

    const totalMarks = normalizedQuestions.reduce((s: number, q: LmsQuizQuestion) => s + q.marks, 0);

    const quiz = {
      id: uid('qz'),
      classId,
      subjectId,
      teacherId: req.user!.linkedStaffId || 'stf-02',
      teacherName: req.user!.name,
      title: String(title).trim(),
      instructions: String(instructions || 'Select the most accurate option for each question.').trim(),
      durationMins: Math.max(5, Number(durationMins) || 15),
      dueDate: dueDate || '2026-11-10',
      totalMarks,
      questions: normalizedQuestions,
      attempts: [],
      status: 'PUBLISHED' as const,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.quizzes)) db.quizzes = [];
    db.quizzes.unshift(quiz);

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Published Online Quiz',
      module: 'LMS Portal',
      details: `Created "${quiz.title}" (${normalizedQuestions.length} questions · ${totalMarks} marks).`,
      ipAddress: clientIp(req),
    });

    res.status(201).json({ quiz });
  }
);

router.delete(
  '/lms/quizzes/:id',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const idx = (db.quizzes || []).findIndex((q) => q.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }
    const removed = db.quizzes.splice(idx, 1)[0];
    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Deleted Online Quiz',
      module: 'LMS Portal',
      details: `Removed quiz "${removed.title}".`,
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  }
);

router.post(
  '/lms/quizzes/:id/attempt',
  authenticateToken,
  authorizeRoles(UserRole.STUDENT, UserRole.SUPER_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const quiz = (db.quizzes || []).find((q) => q.id === req.params.id);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }

    const studentId =
      req.user!.role === UserRole.STUDENT
        ? req.user!.linkedStudentIds[0]
        : (req.body.studentId as string) || req.user!.linkedStudentIds[0];

    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(400).json({ error: 'Student record not found.' });
      return;
    }

    if (
      req.user!.role === UserRole.STUDENT &&
      quiz.attempts.some((a) => a.studentId === student.id)
    ) {
      res.status(400).json({ error: 'You have already submitted this quiz.' });
      return;
    }

    const rawAnswers: number[] = Array.isArray(req.body.answers) ? req.body.answers : [];
    let score = 0;
    const normalizedAnswers = quiz.questions.map((q, idx) => {
      const ans = rawAnswers[idx] !== undefined ? Number(rawAnswers[idx]) : -1;
      if (ans === q.correctOptionIndex) {
        score += q.marks;
      }
      return ans;
    });

    const percentage =
      quiz.totalMarks > 0 ? Number(((score / quiz.totalMarks) * 100).toFixed(1)) : 0;

    const attempt = {
      id: uid('qatt'),
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      answers: normalizedAnswers,
      score,
      totalMarks: quiz.totalMarks,
      percentage,
      submittedAt: new Date().toISOString(),
    };

    const existingIdx = quiz.attempts.findIndex((a) => a.studentId === student.id);
    if (existingIdx >= 0) quiz.attempts[existingIdx] = attempt;
    else quiz.attempts.push(attempt);

    store.logActivity({
      actorId: req.user!.id,
      actorName: student.name,
      actorRole: req.user!.role,
      action: 'Submitted Online Quiz',
      module: 'LMS Portal',
      details: `${student.name} (${student.rollNo}) scored ${score}/${quiz.totalMarks} (${percentage}%) in "${quiz.title}".`,
      ipAddress: clientIp(req),
    });

    res.json({
      attempt,
      quiz: {
        ...quiz,
        attempts:
          req.user!.role === UserRole.STUDENT
            ? quiz.attempts.filter((a) => a.studentId === student.id)
            : quiz.attempts,
      },
    });
  }
);

router.put(
  '/lms/quizzes/:quizId/attempts/:attemptId/remarks',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const quiz = (db.quizzes || []).find((q) => q.id === req.params.quizId);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }
    const attempt = quiz.attempts.find((a) => a.id === req.params.attemptId);
    if (!attempt) {
      res.status(404).json({ error: 'Quiz attempt not found.' });
      return;
    }

    attempt.teacherRemarks = String(req.body.teacherRemarks || '').trim();
    store.commit();
    res.json({ attempt, quiz });
  }
);

router.put(
  '/lms/assignments/:id/grade',
  authenticateToken,
  authorizeRoles(UserRole.SUPER_ADMIN, UserRole.TEACHER),
  (req: AuthenticatedRequest, res: Response) => {
    const db = store.getState();
    const hw = db.homework.find((h) => h.id === req.params.id);
    if (!hw) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    const { studentId, marks, feedback } = req.body as {
      studentId?: string;
      marks?: number;
      feedback?: string;
    };

    const sub = hw.submissions.find((s) => s.studentId === studentId);
    if (!sub) {
      res.status(404).json({ error: 'Student submission not found.' });
      return;
    }

    const maxAllowed = hw.maxMarks || 20;
    sub.marks = Math.min(maxAllowed, Math.max(0, Number(marks) || 0));
    sub.feedback = String(feedback || '').trim();
    sub.status = 'GRADED';
    sub.gradedBy = req.user!.name;
    sub.gradedAt = new Date().toISOString();

    store.logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'Graded Student Assignment',
      module: 'LMS Portal',
      details: `Awarded ${sub.marks}/${maxAllowed} to ${sub.studentName} on "${hw.title}".`,
      ipAddress: clientIp(req),
    });

    res.json({ assignment: hw });
  }
);

export default router;
