import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  DatabaseSchema,
  UserRole,
  ActivityLog,
  LmsLecture,
  LmsQuiz,
  UserAccount,
} from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'school_db.json');

export function generateDefaultLectures(): LmsLecture[] {
  return [
    {
      id: 'lec-01',
      classId: 'cls-10a',
      subjectId: 'sub-math10',
      teacherId: 'stf-02',
      teacherName: 'Majid Ali',
      title: 'Lecture 01: Quadratic Equations & Discriminant Nature of Roots',
      topic: 'Unit 4 · Algebra & Functions',
      durationMins: 42,
      videoUrl: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratics-multiplying-factoring',
      notes:
        'Key Concepts:\n1. Standard form: ax² + bx + c = 0 (a ≠ 0).\n2. Discriminant Δ = b² - 4ac determines root nature:\n   • Δ > 0 → Two distinct real roots\n   • Δ = 0 → Repeated real root (tangent to x-axis)\n   • Δ < 0 → No real roots\n3. Vertex coordinates: (-b / 2a, -Δ / 4a). Practice problems 1–10 before attempting Quiz 1.',
      completedStudentIds: ['std-01', 'std-02'],
      publishedAt: '2026-10-18',
    },
    {
      id: 'lec-02',
      classId: 'cls-10a',
      subjectId: 'sub-phys10',
      teacherId: 'stf-02',
      teacherName: 'Majid Ali',
      title: 'Lecture 02: Electromagnetic Induction — Faraday & Lenz Laws',
      topic: 'Unit 3 · Electromagnetism',
      durationMins: 38,
      videoUrl: 'https://phet.colorado.edu/en/simulations/faradays-law',
      notes:
        'Key Concepts:\n1. Faraday’s Law: Induced EMF is directly proportional to the rate of change of magnetic flux linkage (ε = -N dΦ/dt).\n2. Lenz’s Law: Direction of induced current always opposes the change in magnetic flux producing it (conservation of energy).\n3. Step-up vs Step-down Transformers: Vs / Vp = Ns / Np.',
      completedStudentIds: ['std-01'],
      publishedAt: '2026-10-20',
    },
    {
      id: 'lec-03',
      classId: 'cls-10a',
      subjectId: 'sub-cs10',
      teacherId: 'stf-04',
      teacherName: 'Ashraf Panhwar',
      title: 'Lecture 03: Relational Databases, Primary Keys & 3NF Normalization',
      topic: 'Unit 5 · Database Systems',
      durationMins: 45,
      videoUrl: 'https://sqlbolt.com/',
      notes:
        'Key Concepts:\n1. 1NF: Atomic column values and unique primary key.\n2. 2NF: In 1NF + no partial dependency on composite primary keys.\n3. 3NF: In 2NF + no transitive dependencies between non-key attributes.\n4. Foreign keys enforce referential integrity between Student, Class, and Enrollment tables.',
      completedStudentIds: ['std-01', 'std-03'],
      publishedAt: '2026-10-22',
    },
    {
      id: 'lec-04',
      classId: 'cls-09a',
      subjectId: 'sub-cs09',
      teacherId: 'stf-04',
      teacherName: 'Ashraf Panhwar',
      title: 'Lecture 01: Binary Number System, Logic Gates & Truth Tables',
      topic: 'Unit 2 · Digital Logic',
      durationMins: 35,
      notes:
        'Key Concepts:\n1. Converting Decimal to 8-bit Binary and Hexadecimal.\n2. Core Logic Gates: AND, OR, NOT, NAND, NOR, XOR.\n3. Constructing 2-input and 3-input Truth Tables.',
      completedStudentIds: ['std-04'],
      publishedAt: '2026-10-21',
    },
    {
      id: 'lec-05',
      classId: 'cls-08a',
      subjectId: 'sub-eng08',
      teacherId: 'stf-05',
      teacherName: 'Wazeer Ali Baloch',
      title: 'Lecture 01: Reading Comprehension & Paragraph Structure',
      topic: 'Unit 1 · Composition & Grammar',
      durationMins: 30,
      notes:
        'Key Concepts:\n1. Topic Sentence, Supporting Evidence, and Concluding Statement.\n2. Active vs Passive Voice transformations.\n3. Identifying main idea and context clues in unseen passages.',
      completedStudentIds: ['std-05'],
      publishedAt: '2026-10-21',
    },
  ];
}

export function generateDefaultQuizzes(): LmsQuiz[] {
  return [
    {
      id: 'qz-01',
      classId: 'cls-10a',
      subjectId: 'sub-math10',
      teacherId: 'stf-02',
      teacherName: 'Majid Ali',
      title: 'Quiz 01: Quadratic Functions & Discriminant',
      instructions: 'Answer all 4 multiple-choice questions carefully. Each correct answer carries 5 marks.',
      durationMins: 15,
      dueDate: '2026-10-30',
      totalMarks: 20,
      status: 'PUBLISHED',
      createdAt: '2026-10-21T09:00:00Z',
      questions: [
        {
          id: 'q1',
          questionText: 'For the quadratic equation 2x² - 4x + 2 = 0, what is the value of the discriminant (b² - 4ac)?',
          options: ['0', '8', '-8', '16'],
          correctOptionIndex: 0,
          marks: 5,
        },
        {
          id: 'q2',
          questionText: 'If the discriminant Δ > 0, the graph of y = ax² + bx + c intersects the x-axis at:',
          options: ['No real points', 'Exactly one point', 'Two distinct points', 'The y-intercept only'],
          correctOptionIndex: 2,
          marks: 5,
        },
        {
          id: 'q3',
          questionText: 'What is the x-coordinate of the vertex of y = x² - 6x + 8?',
          options: ['-3', '3', '6', '4'],
          correctOptionIndex: 1,
          marks: 5,
        },
        {
          id: 'q4',
          questionText: 'The sum of the roots of ax² + bx + c = 0 is given by:',
          options: ['c / a', '-b / a', 'b / a', '-c / a'],
          correctOptionIndex: 1,
          marks: 5,
        },
      ],
      attempts: [
        {
          id: 'att-qz-01',
          studentId: 'std-02',
          studentName: 'Shahmer Ali',
          rollNo: '10-2026-002',
          answers: [0, 2, 1, 0],
          score: 15,
          totalMarks: 20,
          percentage: 75,
          submittedAt: '2026-10-23T14:20:00Z',
          teacherRemarks: 'Good conceptual grasp; review root sum formula (-b/a).',
        },
      ],
    },
    {
      id: 'qz-02',
      classId: 'cls-10a',
      subjectId: 'sub-cs10',
      teacherId: 'stf-04',
      teacherName: 'Ashraf Panhwar',
      title: 'Quiz 02: SQL & Database Normalization',
      instructions: 'Select the best option for each relational database question. Total 15 marks.',
      durationMins: 12,
      dueDate: '2026-11-02',
      totalMarks: 15,
      status: 'PUBLISHED',
      createdAt: '2026-10-23T10:00:00Z',
      questions: [
        {
          id: 'csq1',
          questionText: 'Which normal form eliminates transitive dependencies between non-key attributes?',
          options: ['1NF', '2NF', '3NF', 'Unnormalized Form'],
          correctOptionIndex: 2,
          marks: 5,
        },
        {
          id: 'csq2',
          questionText: 'Which SQL clause is used to filter grouped aggregate rows?',
          options: ['WHERE', 'ORDER BY', 'HAVING', 'DISTINCT'],
          correctOptionIndex: 2,
          marks: 5,
        },
        {
          id: 'csq3',
          questionText: 'A field in one table that uniquely references the Primary Key of another table is called:',
          options: ['Candidate Key', 'Foreign Key', 'Alternate Key', 'Sort Key'],
          correctOptionIndex: 1,
          marks: 5,
        },
      ],
      attempts: [
        {
          id: 'att-qz-02',
          studentId: 'std-01',
          studentName: 'Kamran Ali',
          rollNo: '10-2026-001',
          answers: [2, 2, 1],
          score: 15,
          totalMarks: 15,
          percentage: 100,
          submittedAt: '2026-10-24T11:10:00Z',
          teacherRemarks: 'Excellent 100% score!',
        },
      ],
    },
    {
      id: 'qz-03',
      classId: 'cls-09a',
      subjectId: 'sub-cs09',
      teacherId: 'stf-04',
      teacherName: 'Ashraf Panhwar',
      title: 'Quiz 01: Binary Conversion & Logic Gates',
      instructions: 'Attempt all 3 questions within 10 minutes.',
      durationMins: 10,
      dueDate: '2026-11-01',
      totalMarks: 15,
      status: 'PUBLISHED',
      createdAt: '2026-10-22T09:00:00Z',
      questions: [
        {
          id: 'g9q1',
          questionText: 'What is the decimal value of binary 00001101?',
          options: ['11', '13', '14', '15'],
          correctOptionIndex: 1,
          marks: 5,
        },
        {
          id: 'g9q2',
          questionText: 'Which logic gate outputs 1 ONLY when both inputs are 1?',
          options: ['OR Gate', 'XOR Gate', 'AND Gate', 'NOT Gate'],
          correctOptionIndex: 2,
          marks: 5,
        },
        {
          id: 'g9q3',
          questionText: 'How many bits make 1 Byte?',
          options: ['4 bits', '8 bits', '16 bits', '32 bits'],
          correctOptionIndex: 1,
          marks: 5,
        },
      ],
      attempts: [],
    },
    {
      id: 'qz-04',
      classId: 'cls-08a',
      subjectId: 'sub-eng08',
      teacherId: 'stf-05',
      teacherName: 'Wazeer Ali Baloch',
      title: 'Quiz 01: Grammar & Active-Passive Voice',
      instructions: 'Choose the grammatically accurate option for each question.',
      durationMins: 10,
      dueDate: '2026-11-01',
      totalMarks: 10,
      status: 'PUBLISHED',
      createdAt: '2026-10-22T10:30:00Z',
      questions: [
        {
          id: 'g8q1',
          questionText: 'Identify the passive voice of: "The teacher praised the students."',
          options: [
            'The students are praised by the teacher.',
            'The students were praised by the teacher.',
            'The students had praised the teacher.',
            'The teacher was praising the students.',
          ],
          correctOptionIndex: 1,
          marks: 5,
        },
        {
          id: 'g8q2',
          questionText: 'Which sentence in a paragraph states its central idea?',
          options: ['Topic sentence', 'Footnote', 'Appendix', 'Salutation'],
          correctOptionIndex: 0,
          marks: 5,
        },
      ],
      attempts: [],
    },
  ];
}

export function ensureLmsSchemaAndRoles(db: DatabaseSchema): boolean {
  let mutated = false;
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const teacherHash = bcrypt.hashSync('Teacher@123', 10);
  const studentHash = bcrypt.hashSync('Student@123', 10);

  // 1. Enforce strictly ONE Super Admin (Shahid Ali) + Teacher & Student accounts only
  const nextUsers: UserAccount[] = [];
  const existingSuper = db.users.find((u) => u.role === UserRole.SUPER_ADMIN);
  nextUsers.push({
    id: existingSuper?.id || 'usr-superadmin',
    loginId: 'csd241043@dsu.edu.pk',
    name: 'Shahid Ali',
    email: 'csd241043@dsu.edu.pk',
    passwordHash: existingSuper?.passwordHash || adminHash,
    role: UserRole.SUPER_ADMIN,
    phone: existingSuper?.phone || '+92-300-8201100',
    linkedStudentIds: [],
    isActive: true,
    createdAt: existingSuper?.createdAt || '2025-08-01T08:00:00Z',
  });

  // 2. Provision Teacher Portal accounts for active staff members
  for (const stf of db.staff) {
    const existingTeacher = db.users.find(
      (u) => u.linkedStaffId === stf.id && u.role === UserRole.TEACHER
    );
    nextUsers.push({
      id: existingTeacher?.id || `usr-tchr-${stf.id}`,
      loginId: stf.employeeCode,
      name: stf.name,
      email: stf.email,
      passwordHash: existingTeacher?.passwordHash || teacherHash,
      role: UserRole.TEACHER,
      phone: stf.phone,
      linkedStudentIds: [],
      linkedStaffId: stf.id,
      isActive: stf.status !== 'RESIGNED',
      createdAt: existingTeacher?.createdAt || '2025-08-10T09:00:00Z',
    });
  }

  // 3. Provision Student ID Login accounts (loginId = Roll No) for every student
  for (const std of db.students) {
    const existingStudentUser = db.users.find(
      (u) => u.role === UserRole.STUDENT && u.linkedStudentIds.includes(std.id)
    );
    const autoEmail = `${std.rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.gbpskl.edu.pk`;
    nextUsers.push({
      id: existingStudentUser?.id || `usr-std-${std.id}`,
      loginId: std.rollNo,
      name: std.name,
      email: existingStudentUser?.email || autoEmail,
      passwordHash: existingStudentUser?.passwordHash || studentHash,
      role: UserRole.STUDENT,
      phone: std.guardianPhone,
      linkedStudentIds: [std.id],
      isActive: std.status === 'ACTIVE' || std.status === 'PROMOTED',
      createdAt: existingStudentUser?.createdAt || std.createdAt,
    });
  }

  if (
    db.users.length !== nextUsers.length ||
    db.users.some((u, idx) => u.role !== nextUsers[idx]?.role || u.loginId !== nextUsers[idx]?.loginId)
  ) {
    db.users = nextUsers;
    mutated = true;
  }

  // 4. Ensure LMS Lectures & Quizzes collections exist
  if (!Array.isArray((db as any).lectures) || db.lectures.length === 0) {
    db.lectures = generateDefaultLectures();
    mutated = true;
  }
  if (!Array.isArray((db as any).quizzes) || db.quizzes.length === 0) {
    db.quizzes = generateDefaultQuizzes();
    mutated = true;
  }

  // 5. Ensure assignments (homework) have maxMarks and sample assignments for Class 8th & 9th
  if (Array.isArray(db.homework)) {
    db.homework.forEach((hw) => {
      if (!hw.maxMarks) {
        hw.maxMarks = 20;
        mutated = true;
      }
      hw.submissions.forEach((sub) => {
        if (sub.status === 'GRADED' && !sub.feedback) {
          sub.feedback = 'Well structured work and clear steps.';
          sub.gradedBy = 'Majid Ali';
          mutated = true;
        }
      });
    });

    if (!db.homework.some((h) => h.classId === 'cls-09a')) {
      db.homework.push({
        id: 'hw-03',
        classId: 'cls-09a',
        subjectId: 'sub-math09',
        teacherId: 'stf-02',
        title: 'Matrices & Determinants Practice Sheet',
        description: 'Solve Cramer’s Rule and Matrix Inversion questions from Exercise 1.6.',
        dueDate: '2026-10-31',
        maxMarks: 20,
        attachmentName: 'matrices_ex_1_6.pdf',
        submissions: [],
        createdAt: '2026-10-22T09:00:00Z',
      });
      mutated = true;
    }

    if (!db.homework.some((h) => h.classId === 'cls-08a')) {
      db.homework.push({
        id: 'hw-04',
        classId: 'cls-08a',
        subjectId: 'sub-eng08',
        teacherId: 'stf-05',
        title: 'Descriptive Essay: Village Community & Education',
        description: 'Write a 250-word structured essay with clear topic sentences and transitions.',
        dueDate: '2026-11-01',
        maxMarks: 20,
        attachmentName: 'essay_rubric_g8.pdf',
        submissions: [],
        createdAt: '2026-10-22T10:00:00Z',
      });
      mutated = true;
    }
  }

  return mutated;
}

export function generateSeedDatabase(): DatabaseSchema {
  const adminHash = bcrypt.hashSync('Admin@123', 10);

  const seeded: DatabaseSchema = {
    users: [
      {
        id: 'usr-superadmin',
        loginId: 'csd241043@dsu.edu.pk',
        name: 'Shahid Ali',
        email: 'csd241043@dsu.edu.pk',
        passwordHash: adminHash,
        role: UserRole.SUPER_ADMIN,
        phone: '+92-300-8201100',
        linkedStudentIds: [],
        isActive: true,
        createdAt: '2025-08-01T08:00:00Z',
      },
    ],
    classes: [
      { id: 'cls-01a', name: 'Class 1st', section: 'A', roomNumber: 'R-101', classTeacherId: 'stf-05', capacity: 35 },
      { id: 'cls-02a', name: 'Class 2nd', section: 'A', roomNumber: 'R-102', classTeacherId: 'stf-05', capacity: 35 },
      { id: 'cls-03a', name: 'Class 3rd', section: 'A', roomNumber: 'R-103', classTeacherId: 'stf-03', capacity: 35 },
      { id: 'cls-04a', name: 'Class 4th', section: 'A', roomNumber: 'R-104', classTeacherId: 'stf-03', capacity: 35 },
      { id: 'cls-05a', name: 'Class 5th', section: 'A', roomNumber: 'R-105', classTeacherId: 'stf-04', capacity: 35 },
      { id: 'cls-06a', name: 'Class 6th', section: 'A', roomNumber: 'R-106', classTeacherId: 'stf-04', capacity: 35 },
      { id: 'cls-07a', name: 'Class 7th', section: 'A', roomNumber: 'R-107', classTeacherId: 'stf-03', capacity: 35 },
      { id: 'cls-08a', name: 'Class 8th', section: 'A', roomNumber: 'R-108', classTeacherId: 'stf-05', capacity: 35 },
      { id: 'cls-09a', name: 'Class 9th', section: 'A', roomNumber: 'R-109', classTeacherId: 'stf-04', capacity: 35 },
      { id: 'cls-10a', name: 'Class 10th', section: 'A', roomNumber: 'R-110', classTeacherId: 'stf-02', capacity: 35 },
    ],
    staff: [
      {
        id: 'stf-01',
        employeeCode: 'EMP-1001',
        name: 'Dr. Anwar Baloch',
        email: 'anwar.baloch@gbpskl.edu.pk',
        phone: '+92-300-8201102',
        designation: 'Principal',
        department: 'Administration',
        qualification: 'Ph.D Educational Leadership',
        joinDate: '2020-04-01',
        baseSalary: 195000,
        allowances: 25000,
        status: 'ACTIVE',
      },
      {
        id: 'stf-02',
        employeeCode: 'EMP-1002',
        name: 'Majid Ali',
        email: 'majid.ali@gbpskl.edu.pk',
        phone: '+92-321-4459011',
        designation: 'Senior Mathematics & Physics Teacher',
        department: 'Mathematics & Sciences',
        qualification: 'M.Sc Applied Mathematics',
        joinDate: '2021-08-15',
        baseSalary: 115000,
        allowances: 15000,
        status: 'ACTIVE',
      },
      {
        id: 'stf-03',
        employeeCode: 'EMP-1003',
        name: 'Sajjad Ali',
        email: 'sajjad.ali@gbpskl.edu.pk',
        phone: '+92-334-7781203',
        designation: 'Chemistry & Biology Teacher',
        department: 'Natural Sciences',
        qualification: 'M.Phil Biochemistry',
        joinDate: '2022-01-10',
        baseSalary: 105000,
        allowances: 12000,
        status: 'ACTIVE',
      },
      {
        id: 'stf-04',
        employeeCode: 'EMP-1004',
        name: 'Ashraf Panhwar',
        email: 'ashraf.panhwar@gbpskl.edu.pk',
        phone: '+92-345-6198820',
        designation: 'Computer Science Instructor',
        department: 'Computing & IT',
        qualification: 'BS Computer Science',
        joinDate: '2022-08-20',
        baseSalary: 110000,
        allowances: 14000,
        status: 'ACTIVE',
      },
      {
        id: 'stf-05',
        employeeCode: 'EMP-1005',
        name: 'Wazeer Ali Baloch',
        email: 'wazeer.baloch@gbpskl.edu.pk',
        phone: '+92-333-5120984',
        designation: 'Senior Finance & Humanities Officer',
        department: 'Accounts & Humanities',
        qualification: 'MBA Finance / MA English',
        joinDate: '2021-09-01',
        baseSalary: 120000,
        allowances: 15000,
        status: 'ACTIVE',
      },
    ],
    students: [
      {
        id: 'std-01',
        admissionNo: 'ADM-2026-101',
        rollNo: '10-2026-001',
        name: 'Kamran Ali',
        gender: 'Male',
        dob: '2010-05-14',
        bloodGroup: 'B+',
        classId: 'cls-10a',
        section: 'A',
        admissionDate: '2026-10-01',
        status: 'ACTIVE',
        address: 'Kando Lund, District Dadu, Sindh',
        guardianName: 'Tariq Ali',
        guardianRelation: 'Father',
        guardianPhone: '+92-300-9214450',
        guardianEmail: 'parent@gbpskl.edu.pk',
        guardianCnic: '41201-8891204-1',
        scholarshipPercent: 20,
        transportRouteId: 'trp-01',
        documents: [
          { id: 'doc-1', title: 'B-Form / Birth Certificate', fileName: 'kamran_ali_bform.pdf', fileType: 'PDF', uploadedAt: '2026-10-01', verified: true },
          { id: 'doc-2', title: 'Previous Grade Transcript', fileName: 'grade9_transcript.pdf', fileType: 'PDF', uploadedAt: '2026-10-01', verified: true },
        ],
        createdAt: '2026-10-01T09:00:00Z',
      },
      {
        id: 'std-02',
        admissionNo: 'ADM-2026-102',
        rollNo: '10-2026-002',
        name: 'Shahmer Ali',
        gender: 'Male',
        dob: '2010-08-22',
        bloodGroup: 'O+',
        classId: 'cls-10a',
        section: 'A',
        admissionDate: '2026-10-02',
        status: 'ACTIVE',
        address: 'Main Bazaar Road, Kando Lund, Dadu',
        guardianName: 'Ghulam Mustafa',
        guardianRelation: 'Father',
        guardianPhone: '+92-321-8812340',
        guardianEmail: 'ghulam.mustafa@example.com',
        guardianCnic: '41201-5539102-3',
        scholarshipPercent: 0,
        hostelRoomId: 'hst-01',
        documents: [
          { id: 'doc-3', title: 'B-Form / Birth Certificate', fileName: 'shahmer_ali_bform.pdf', fileType: 'PDF', uploadedAt: '2026-10-02', verified: true },
        ],
        createdAt: '2026-10-02T09:30:00Z',
      },
      {
        id: 'std-03',
        admissionNo: 'ADM-2026-103',
        rollNo: '10-2026-003',
        name: 'Ahsan Ali',
        gender: 'Male',
        dob: '2010-11-03',
        bloodGroup: 'A+',
        classId: 'cls-10a',
        section: 'A',
        admissionDate: '2026-10-03',
        status: 'ACTIVE',
        address: 'Station Road, Johi / Kando Lund, Dadu',
        guardianName: 'Noor Muhammad',
        guardianRelation: 'Father',
        guardianPhone: '+92-333-2109432',
        guardianEmail: 'noor.muhammad@example.com',
        guardianCnic: '41201-7712304-9',
        scholarshipPercent: 10,
        transportRouteId: 'trp-02',
        documents: [
          { id: 'doc-4', title: 'B-Form / Birth Certificate', fileName: 'ahsan_ali_bform.pdf', fileType: 'PDF', uploadedAt: '2026-10-03', verified: true },
        ],
        createdAt: '2026-10-03T10:00:00Z',
      },
      {
        id: 'std-04',
        admissionNo: 'ADM-2026-104',
        rollNo: '10-2026-004',
        name: 'Fahad Ali',
        gender: 'Male',
        dob: '2010-02-19',
        bloodGroup: 'AB+',
        classId: 'cls-09a',
        section: 'A',
        admissionDate: '2026-10-04',
        status: 'ACTIVE',
        address: 'Canal Colony, Kando Lund, Dadu',
        guardianName: 'Sikandar Ali',
        guardianRelation: 'Father',
        guardianPhone: '+92-300-2298412',
        guardianEmail: 'sikandar.ali@example.com',
        guardianCnic: '41201-9940123-5',
        scholarshipPercent: 0,
        transportRouteId: 'trp-03',
        documents: [],
        createdAt: '2026-10-04T10:15:00Z',
      },
      {
        id: 'std-05',
        admissionNo: 'ADM-2026-105',
        rollNo: '10-2026-005',
        name: 'Zameer Ali',
        gender: 'Male',
        dob: '2011-09-10',
        bloodGroup: 'B+',
        classId: 'cls-08a',
        section: 'A',
        admissionDate: '2026-10-05',
        status: 'ACTIVE',
        address: 'Kando Lund, District Dadu, Sindh',
        guardianName: 'Tariq Ali',
        guardianRelation: 'Father',
        guardianPhone: '+92-300-9214450',
        guardianEmail: 'parent@gbpskl.edu.pk',
        guardianCnic: '41201-8891204-1',
        scholarshipPercent: 0,
        transportRouteId: 'trp-01',
        documents: [
          { id: 'doc-5', title: 'B-Form / Birth Certificate', fileName: 'zameer_ali_bform.pdf', fileType: 'PDF', uploadedAt: '2026-10-05', verified: true },
        ],
        createdAt: '2026-10-05T11:00:00Z',
      },
    ],
    subjects: [
      { id: 'sub-gen01', code: 'ENG-011', name: 'English & Phonics', classId: 'cls-01a', teacherId: 'stf-05', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-gen02', code: 'MTH-021', name: 'Primary Mathematics', classId: 'cls-02a', teacherId: 'stf-02', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-gen03', code: 'SCI-031', name: 'General Science', classId: 'cls-03a', teacherId: 'stf-03', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-gen04', code: 'MTH-041', name: 'Elementary Mathematics', classId: 'cls-04a', teacherId: 'stf-02', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-gen05', code: 'SCI-051', name: 'General Science', classId: 'cls-05a', teacherId: 'stf-03', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-gen06', code: 'CSC-061', name: 'Computer Fundamentals', classId: 'cls-06a', teacherId: 'stf-04', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-gen07', code: 'MTH-071', name: 'Middle School Mathematics', classId: 'cls-07a', teacherId: 'stf-02', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-eng08', code: 'ENG-085', name: 'English Literature', classId: 'cls-08a', teacherId: 'stf-05', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-math09', code: 'MTH-091', name: 'Mathematics', classId: 'cls-09a', teacherId: 'stf-02', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-cs09', code: 'CSC-094', name: 'Computer Studies', classId: 'cls-09a', teacherId: 'stf-04', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-math10', code: 'MTH-101', name: 'Additional Mathematics', classId: 'cls-10a', teacherId: 'stf-02', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-phys10', code: 'PHY-102', name: 'Physics', classId: 'cls-10a', teacherId: 'stf-02', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-chem10', code: 'CHM-103', name: 'Chemistry', classId: 'cls-10a', teacherId: 'stf-03', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-cs10', code: 'CSC-104', name: 'Computer Science', classId: 'cls-10a', teacherId: 'stf-04', totalMarks: 100, passingMarks: 40 },
      { id: 'sub-eng10', code: 'ENG-105', name: 'English Language', classId: 'cls-10a', teacherId: 'stf-05', totalMarks: 100, passingMarks: 40 },
    ],
    timetable: [
      { id: 'tt-1', classId: 'cls-10a', dayOfWeek: 'Monday', periodNo: 1, startTime: '08:00', endTime: '08:50', subjectId: 'sub-math10', teacherId: 'stf-02', room: 'R-201' },
      { id: 'tt-2', classId: 'cls-10a', dayOfWeek: 'Monday', periodNo: 2, startTime: '08:50', endTime: '09:40', subjectId: 'sub-phys10', teacherId: 'stf-02', room: 'Lab-01' },
      { id: 'tt-3', classId: 'cls-10a', dayOfWeek: 'Monday', periodNo: 3, startTime: '09:40', endTime: '10:30', subjectId: 'sub-chem10', teacherId: 'stf-03', room: 'Lab-02' },
      { id: 'tt-4', classId: 'cls-10a', dayOfWeek: 'Tuesday', periodNo: 1, startTime: '08:00', endTime: '08:50', subjectId: 'sub-cs10', teacherId: 'stf-04', room: 'IT-Lab' },
      { id: 'tt-5', classId: 'cls-10a', dayOfWeek: 'Tuesday', periodNo: 2, startTime: '08:50', endTime: '09:40', subjectId: 'sub-eng10', teacherId: 'stf-05', room: 'R-201' },
      { id: 'tt-6', classId: 'cls-10a', dayOfWeek: 'Wednesday', periodNo: 1, startTime: '08:00', endTime: '08:50', subjectId: 'sub-math10', teacherId: 'stf-02', room: 'R-201' },
      { id: 'tt-7', classId: 'cls-10a', dayOfWeek: 'Thursday', periodNo: 1, startTime: '08:00', endTime: '08:50', subjectId: 'sub-phys10', teacherId: 'stf-02', room: 'R-201' },
      { id: 'tt-8', classId: 'cls-10a', dayOfWeek: 'Friday', periodNo: 1, startTime: '08:00', endTime: '08:50', subjectId: 'sub-cs10', teacherId: 'stf-04', room: 'IT-Lab' },
      { id: 'tt-9', classId: 'cls-09a', dayOfWeek: 'Monday', periodNo: 2, startTime: '08:50', endTime: '09:40', subjectId: 'sub-cs09', teacherId: 'stf-04', room: 'R-104' },
      { id: 'tt-10', classId: 'cls-09a', dayOfWeek: 'Wednesday', periodNo: 2, startTime: '08:50', endTime: '09:40', subjectId: 'sub-math09', teacherId: 'stf-02', room: 'R-104' },
    ],
    homework: [
      {
        id: 'hw-01',
        classId: 'cls-10a',
        subjectId: 'sub-math10',
        teacherId: 'stf-02',
        title: 'Quadratic Functions & Discriminant Problem Set',
        description: 'Complete Exercises 4.2 and 4.3 (Questions 1–14) showing full algebraic steps and vertex sketches.',
        dueDate: '2026-10-28',
        attachmentName: 'quadratic_problem_set_ch4.pdf',
        submissions: [
          {
            studentId: 'std-01',
            studentName: 'Kamran Ali',
            submittedAt: '2026-10-23T16:40:00Z',
            notes: 'Completed all 14 problems including graph sketches.',
            attachmentName: 'kamran_ali_math_hw4.pdf',
            status: 'GRADED',
            marks: 19,
          },
        ],
        createdAt: '2026-10-20T09:00:00Z',
      },
      {
        id: 'hw-02',
        classId: 'cls-10a',
        subjectId: 'sub-cs10',
        teacherId: 'stf-04',
        title: 'Relational Database Normalization Lab',
        description: 'Design 1NF, 2NF, and 3NF table schemas for a hospital patient booking case study.',
        dueDate: '2026-10-30',
        maxMarks: 20,
        attachmentName: 'db_normalization_lab.pdf',
        submissions: [],
        createdAt: '2026-10-22T11:00:00Z',
      },
    ],
    lectures: generateDefaultLectures(),
    quizzes: generateDefaultQuizzes(),
    syllabus: [
      { id: 'syl-01', classId: 'cls-10a', subjectId: 'sub-math10', term: 'Autumn Term 2026', unitTitle: 'Unit 4: Differential Calculus Foundations', topics: 'Limits, First Principles, Chain & Product Rules, Stationary Points', completionPercent: 85, targetDate: '2026-11-10' },
      { id: 'syl-02', classId: 'cls-10a', subjectId: 'sub-phys10', term: 'Autumn Term 2026', unitTitle: 'Unit 3: Electromagnetism & Induction', topics: 'Magnetic Flux, Faraday Law, Lenz Law, AC Generators & Transformers', completionPercent: 70, targetDate: '2026-11-18' },
      { id: 'syl-03', classId: 'cls-10a', subjectId: 'sub-cs10', term: 'Autumn Term 2026', unitTitle: 'Unit 5: Algorithms & Data Structures', topics: 'Binary Search, Merge Sort, Stacks, Queues, SQL Queries', completionPercent: 92, targetDate: '2026-11-05' },
      { id: 'syl-04', classId: 'cls-10a', subjectId: 'sub-chem10', term: 'Autumn Term 2026', unitTitle: 'Unit 4: Chemical Energetics & Equilibrium', topics: 'Enthalpy Profiles, Hess Law, Le Chatelier Principle, Haber Process', completionPercent: 65, targetDate: '2026-11-22' },
    ],
    studentAttendance: [
      { id: 'att-1', studentId: 'std-01', classId: 'cls-10a', date: '2026-10-22', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-2', studentId: 'std-02', classId: 'cls-10a', date: '2026-10-22', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-3', studentId: 'std-03', classId: 'cls-10a', date: '2026-10-22', status: 'ABSENT', remarks: 'Uninformed absence', markedBy: 'Majid Ali', notifiedParent: true },
      { id: 'att-4', studentId: 'std-04', classId: 'cls-09a', date: '2026-10-22', status: 'PRESENT', markedBy: 'Ashraf Panhwar', notifiedParent: false },
      { id: 'att-5', studentId: 'std-01', classId: 'cls-10a', date: '2026-10-23', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-6', studentId: 'std-02', classId: 'cls-10a', date: '2026-10-23', status: 'LATE', remarks: 'Morning bus delay 15 mins', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-7', studentId: 'std-03', classId: 'cls-10a', date: '2026-10-23', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-8', studentId: 'std-04', classId: 'cls-09a', date: '2026-10-23', status: 'PRESENT', markedBy: 'Ashraf Panhwar', notifiedParent: false },
      { id: 'att-9', studentId: 'std-01', classId: 'cls-10a', date: '2026-10-24', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-10', studentId: 'std-02', classId: 'cls-10a', date: '2026-10-24', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-11', studentId: 'std-03', classId: 'cls-10a', date: '2026-10-24', status: 'PRESENT', markedBy: 'Majid Ali', notifiedParent: false },
      { id: 'att-12', studentId: 'std-04', classId: 'cls-09a', date: '2026-10-24', status: 'LEAVE', remarks: 'Approved medical appointment', markedBy: 'Ashraf Panhwar', notifiedParent: false },
      { id: 'att-13', studentId: 'std-05', classId: 'cls-08a', date: '2026-10-24', status: 'PRESENT', markedBy: 'Wazeer Ali Baloch', notifiedParent: false },
    ],
    staffAttendance: [
      { id: 'satt-1', staffId: 'stf-01', date: '2026-10-24', status: 'PRESENT', checkIn: '07:42' },
      { id: 'satt-2', staffId: 'stf-02', date: '2026-10-24', status: 'PRESENT', checkIn: '07:50' },
      { id: 'satt-3', staffId: 'stf-03', date: '2026-10-24', status: 'PRESENT', checkIn: '07:55' },
      { id: 'satt-4', staffId: 'stf-04', date: '2026-10-24', status: 'LATE', checkIn: '08:14', remarks: 'Road delay' },
      { id: 'satt-5', staffId: 'stf-05', date: '2026-10-24', status: 'PRESENT', checkIn: '07:48' },
    ],
    exams: [
      {
        id: 'exm-mid26',
        name: 'Midterm Assessment 2026',
        term: 'Autumn Term',
        academicYear: '2026-2027',
        startDate: '2026-10-05',
        endDate: '2026-10-14',
        status: 'PUBLISHED',
        datesheet: [
          { subjectId: 'sub-math10', subjectName: 'Additional Mathematics', classId: 'cls-10a', examDate: '2026-10-05', startTime: '09:00', durationMins: 120, room: 'Main Hall A' },
          { subjectId: 'sub-phys10', subjectName: 'Physics', classId: 'cls-10a', examDate: '2026-10-07', startTime: '09:00', durationMins: 120, room: 'Main Hall A' },
          { subjectId: 'sub-chem10', subjectName: 'Chemistry', classId: 'cls-10a', examDate: '2026-10-09', startTime: '09:00', durationMins: 120, room: 'Main Hall B' },
          { subjectId: 'sub-cs10', subjectName: 'Computer Science', classId: 'cls-10a', examDate: '2026-10-12', startTime: '09:00', durationMins: 120, room: 'IT Hall' },
          { subjectId: 'sub-eng10', subjectName: 'English Language', classId: 'cls-10a', examDate: '2026-10-14', startTime: '09:00', durationMins: 120, room: 'Main Hall A' },
        ],
      },
      {
        id: 'exm-fin26',
        name: 'Winter Terminal Examination 2026',
        term: 'Winter Term',
        academicYear: '2026-2027',
        startDate: '2026-12-07',
        endDate: '2026-12-18',
        status: 'SCHEDULED',
        datesheet: [
          { subjectId: 'sub-math10', subjectName: 'Additional Mathematics', classId: 'cls-10a', examDate: '2026-12-07', startTime: '09:00', durationMins: 180, room: 'Main Hall A' },
          { subjectId: 'sub-phys10', subjectName: 'Physics', classId: 'cls-10a', examDate: '2026-12-10', startTime: '09:00', durationMins: 180, room: 'Main Hall A' },
        ],
      },
    ],
    examMarks: [
      // Kamran Ali (std-01) - Top Performer
      { id: 'mk-1', examId: 'exm-mid26', studentId: 'std-01', subjectId: 'sub-math10', marksObtained: 96, maxMarks: 100, remarks: 'Exceptional analytical rigor' },
      { id: 'mk-2', examId: 'exm-mid26', studentId: 'std-01', subjectId: 'sub-phys10', marksObtained: 91, maxMarks: 100, remarks: 'Strong conceptual command' },
      { id: 'mk-3', examId: 'exm-mid26', studentId: 'std-01', subjectId: 'sub-chem10', marksObtained: 89, maxMarks: 100, remarks: 'Accurate stoichiometry' },
      { id: 'mk-4', examId: 'exm-mid26', studentId: 'std-01', subjectId: 'sub-cs10', marksObtained: 95, maxMarks: 100, remarks: 'Clean SQL & algorithm design' },
      { id: 'mk-5', examId: 'exm-mid26', studentId: 'std-01', subjectId: 'sub-eng10', marksObtained: 88, maxMarks: 100, remarks: 'Articulate critical essay' },
      // Shahmer Ali (std-02)
      { id: 'mk-6', examId: 'exm-mid26', studentId: 'std-02', subjectId: 'sub-math10', marksObtained: 82, maxMarks: 100, remarks: 'Good progress' },
      { id: 'mk-7', examId: 'exm-mid26', studentId: 'std-02', subjectId: 'sub-phys10', marksObtained: 79, maxMarks: 100, remarks: 'Review numerical units' },
      { id: 'mk-8', examId: 'exm-mid26', studentId: 'std-02', subjectId: 'sub-chem10', marksObtained: 76, maxMarks: 100, remarks: 'Consistent effort' },
      { id: 'mk-9', examId: 'exm-mid26', studentId: 'std-02', subjectId: 'sub-cs10', marksObtained: 88, maxMarks: 100, remarks: 'Strong practical logic' },
      { id: 'mk-10', examId: 'exm-mid26', studentId: 'std-02', subjectId: 'sub-eng10', marksObtained: 80, maxMarks: 100, remarks: 'Well-structured prose' },
      // Ahsan Ali (std-03)
      { id: 'mk-11', examId: 'exm-mid26', studentId: 'std-03', subjectId: 'sub-math10', marksObtained: 89, maxMarks: 100, remarks: 'Very accurate' },
      { id: 'mk-12', examId: 'exm-mid26', studentId: 'std-03', subjectId: 'sub-phys10', marksObtained: 85, maxMarks: 100, remarks: 'Commendable lab analysis' },
      { id: 'mk-13', examId: 'exm-mid26', studentId: 'std-03', subjectId: 'sub-chem10', marksObtained: 92, maxMarks: 100, remarks: 'Highest in Chemistry' },
      { id: 'mk-14', examId: 'exm-mid26', studentId: 'std-03', subjectId: 'sub-cs10', marksObtained: 84, maxMarks: 100, remarks: 'Good trace tables' },
      { id: 'mk-15', examId: 'exm-mid26', studentId: 'std-03', subjectId: 'sub-eng10', marksObtained: 90, maxMarks: 100, remarks: 'Polished composition' },
      // Fahad Ali (std-04) Class 9th
      { id: 'mk-21', examId: 'exm-mid26', studentId: 'std-04', subjectId: 'sub-math09', marksObtained: 87, maxMarks: 100, remarks: 'Strong algebra skills' },
      { id: 'mk-22', examId: 'exm-mid26', studentId: 'std-04', subjectId: 'sub-cs09', marksObtained: 91, maxMarks: 100, remarks: 'Excellent problem solving' },
      // Zameer Ali (std-05) Class 8th
      { id: 'mk-23', examId: 'exm-mid26', studentId: 'std-05', subjectId: 'sub-eng08', marksObtained: 88, maxMarks: 100, remarks: 'Clear reading comprehension' },
    ],
    feeStructures: [
      { id: 'fs-01a', classId: 'cls-01a', tuitionFee: 8500, labFee: 500, libraryFee: 500, examFee: 800, lateFinePerDay: 50 },
      { id: 'fs-02a', classId: 'cls-02a', tuitionFee: 9000, labFee: 500, libraryFee: 500, examFee: 800, lateFinePerDay: 50 },
      { id: 'fs-03a', classId: 'cls-03a', tuitionFee: 9500, labFee: 600, libraryFee: 500, examFee: 900, lateFinePerDay: 50 },
      { id: 'fs-04a', classId: 'cls-04a', tuitionFee: 10500, labFee: 700, libraryFee: 600, examFee: 900, lateFinePerDay: 60 },
      { id: 'fs-05a', classId: 'cls-05a', tuitionFee: 11500, labFee: 800, libraryFee: 600, examFee: 1000, lateFinePerDay: 75 },
      { id: 'fs-06a', classId: 'cls-06a', tuitionFee: 12500, labFee: 1000, libraryFee: 700, examFee: 1000, lateFinePerDay: 80 },
      { id: 'fs-07a', classId: 'cls-07a', tuitionFee: 13500, labFee: 1200, libraryFee: 700, examFee: 1100, lateFinePerDay: 90 },
      { id: 'fs-08a', classId: 'cls-08a', tuitionFee: 15000, labFee: 1500, libraryFee: 800, examFee: 1200, lateFinePerDay: 100 },
      { id: 'fs-09a', classId: 'cls-09a', tuitionFee: 16500, labFee: 2000, libraryFee: 1000, examFee: 1500, lateFinePerDay: 120 },
      { id: 'fs-10a', classId: 'cls-10a', tuitionFee: 18500, labFee: 2500, libraryFee: 1000, examFee: 1500, lateFinePerDay: 150 },
    ],
    feeVouchers: [
      {
        id: 'vch-01',
        voucherNo: 'VCH-202610-101',
        studentId: 'std-01',
        classId: 'cls-10a',
        billingMonth: 'October 2026',
        dueDate: '2026-10-10',
        baseAmount: 23500,
        transportFee: 4500,
        hostelFee: 0,
        discountAmount: 4700,
        lateFine: 0,
        netAmount: 23300,
        paidAmount: 23300,
        status: 'PAID',
        paymentMethod: 'JazzCash',
        paymentReference: 'JC-982341109',
        paidAt: '2026-10-08T11:20:00Z',
      },
      {
        id: 'vch-02',
        voucherNo: 'VCH-202610-102',
        studentId: 'std-02',
        classId: 'cls-10a',
        billingMonth: 'October 2026',
        dueDate: '2026-10-10',
        baseAmount: 23500,
        transportFee: 0,
        hostelFee: 14000,
        discountAmount: 0,
        lateFine: 750,
        netAmount: 38250,
        paidAmount: 0,
        status: 'OVERDUE',
      },
      {
        id: 'vch-03',
        voucherNo: 'VCH-202610-103',
        studentId: 'std-03',
        classId: 'cls-10a',
        billingMonth: 'October 2026',
        dueDate: '2026-10-10',
        baseAmount: 23500,
        transportFee: 4800,
        hostelFee: 0,
        discountAmount: 2350,
        lateFine: 0,
        netAmount: 25950,
        paidAmount: 25950,
        status: 'PAID',
        paymentMethod: 'Easypaisa',
        paymentReference: 'EP-449012834',
        paidAt: '2026-10-09T14:05:00Z',
      },
      {
        id: 'vch-04',
        voucherNo: 'VCH-202610-104',
        studentId: 'std-04',
        classId: 'cls-09a',
        billingMonth: 'October 2026',
        dueDate: '2026-10-10',
        baseAmount: 21000,
        transportFee: 5200,
        hostelFee: 0,
        discountAmount: 0,
        lateFine: 900,
        netAmount: 27100,
        paidAmount: 15000,
        status: 'PARTIAL',
        paymentMethod: 'Bank Transfer',
        paymentReference: 'HBL-7712390',
        paidAt: '2026-10-12T10:00:00Z',
      },
      {
        id: 'vch-05',
        voucherNo: 'VCH-202610-105',
        studentId: 'std-05',
        classId: 'cls-08a',
        billingMonth: 'October 2026',
        dueDate: '2026-10-28',
        baseAmount: 18500,
        transportFee: 4500,
        hostelFee: 0,
        discountAmount: 0,
        lateFine: 0,
        netAmount: 23000,
        paidAmount: 0,
        status: 'UNPAID',
      },
    ],
    payroll: [
      { id: 'pay-01', staffId: 'stf-01', month: 'October 2026', baseSalary: 195000, allowances: 25000, deductions: 8500, netSalary: 211500, status: 'PAID', paidOn: '2026-10-01' },
      { id: 'pay-02', staffId: 'stf-02', month: 'October 2026', baseSalary: 115000, allowances: 15000, deductions: 3500, netSalary: 126500, status: 'PAID', paidOn: '2026-10-01' },
      { id: 'pay-03', staffId: 'stf-03', month: 'October 2026', baseSalary: 105000, allowances: 12000, deductions: 2800, netSalary: 114200, status: 'PAID', paidOn: '2026-10-02' },
      { id: 'pay-04', staffId: 'stf-04', month: 'October 2026', baseSalary: 110000, allowances: 14000, deductions: 3000, netSalary: 121000, status: 'PENDING' },
      { id: 'pay-05', staffId: 'stf-05', month: 'October 2026', baseSalary: 120000, allowances: 15000, deductions: 4000, netSalary: 131000, status: 'PAID', paidOn: '2026-10-01' },
    ],
    leaveRequests: [
      { id: 'lv-01', staffId: 'stf-03', leaveType: 'Academic Leave', fromDate: '2026-11-02', toDate: '2026-11-04', reason: 'Presenting chemistry curriculum paper at Provincial Science Symposium.', status: 'PENDING' },
      { id: 'lv-02', staffId: 'stf-04', leaveType: 'Casual Leave', fromDate: '2026-10-18', toDate: '2026-10-19', reason: 'Family ceremony in Dadu.', status: 'APPROVED', reviewedBy: 'Dr. Anwar Baloch' },
    ],
    notices: [
      {
        id: 'ntc-01',
        title: 'Autumn Parent-Teacher Conference — Saturday, Oct 31',
        content: 'All parents of Grade 8 to Grade 10 students are invited to attend one-on-one academic review sessions between 09:00 AM and 01:30 PM in the Academic Block.',
        audience: 'ALL',
        category: 'Academic',
        publishedBy: 'Dr. Anwar Baloch',
        publishDate: '2026-10-21',
      },
      {
        id: 'ntc-02',
        title: 'Winter Terminal Examination Datesheet Released',
        content: 'The Winter Terminal Examination 2026 will commence on December 7, 2026. Students must clear library dues and collect examination admit cards by November 28.',
        audience: 'STUDENTS',
        category: 'Examination',
        publishedBy: 'Majid Ali',
        publishDate: '2026-10-19',
      },
      {
        id: 'ntc-03',
        title: 'Annual Science & Robotics Exhibition Registration',
        content: 'Inter-house STEM project proposals are open until November 6. Teams of up to three students may submit hardware or software prototypes to Lab-01.',
        audience: 'ALL',
        category: 'Event',
        publishedBy: 'Ashraf Panhwar',
        publishDate: '2026-10-16',
      },
    ],
    communicationLogs: [
      {
        id: 'cml-01',
        channel: 'SMS',
        recipientName: 'Noor Muhammad (Guardian of Ahsan Ali)',
        recipientContact: '+92-333-2109432',
        subject: 'Daily Attendance Alert',
        message: 'GBPS: Kando Lund Alert: Ahsan Ali (Roll 10-2026-003) was marked ABSENT on 2026-10-22. Please inform the school office if leave is medical.',
        status: 'DELIVERED',
        sentAt: '2026-10-22T08:35:00Z',
      },
      {
        id: 'cml-02',
        channel: 'WHATSAPP',
        recipientName: 'All Grade 10 Parents',
        recipientContact: 'Broadcast List (Guardians)',
        subject: 'Midterm Report Cards Published',
        message: 'Midterm Assessment 2026 results have been published on the Parent Portal. Sign in to review subject grades and download official transcripts.',
        status: 'DELIVERED',
        sentAt: '2026-10-17T15:10:00Z',
      },
      {
        id: 'cml-03',
        channel: 'EMAIL',
        recipientName: 'Ghulam Mustafa',
        recipientContact: 'ghulam.mustafa@example.com',
        subject: 'October Fee Voucher Overdue Reminder',
        message: 'Dear Guardian, Voucher VCH-202610-102 for Shahmer Ali (Roll 10-2026-002, PKR 38,250) is past its due date. You may pay online via JazzCash, Easypaisa, or Bank Transfer.',
        status: 'DELIVERED',
        sentAt: '2026-10-15T10:00:00Z',
      },
    ],
    ptmSchedules: [
      { id: 'ptm-01', title: 'Class 10th-A Midterm Review', date: '2026-10-31', timeSlot: '09:30 AM - 11:30 AM', classId: 'cls-10a', teacherId: 'stf-02', room: 'R-110', notes: 'Bring signed Midterm Report Card.' },
      { id: 'ptm-02', title: 'Class 9th-A STEM Progress Briefing', date: '2026-10-31', timeSlot: '11:30 AM - 01:00 PM', classId: 'cls-09a', teacherId: 'stf-04', room: 'R-109', notes: 'Focus on Computer Science practical portfolios.' },
    ],
    libraryBooks: [
      { id: 'bk-01', isbn: '978-0521727969', title: 'Additional Mathematics — Secondary Curriculum', author: 'Sue Pemberton', category: 'Mathematics', totalCopies: 18, availableCopies: 15, shelfLocation: 'A-12' },
      { id: 'bk-02', isbn: '978-1108859073', title: 'Physics Matters: Conceptual & Analytical', author: 'Dr. Charles Chew', category: 'Physics', totalCopies: 14, availableCopies: 12, shelfLocation: 'B-04' },
      { id: 'bk-03', isbn: '978-0262033848', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', totalCopies: 8, availableCopies: 6, shelfLocation: 'C-09' },
      { id: 'bk-04', isbn: '978-0141439518', title: 'English Grammar & Composition', author: 'Wren & Martin', category: 'Literature', totalCopies: 20, availableCopies: 19, shelfLocation: 'D-02' },
    ],
    libraryIssues: [
      { id: 'iss-01', bookId: 'bk-01', studentId: 'std-01', issueDate: '2026-10-10', dueDate: '2026-10-28', fineAmount: 0, status: 'ISSUED' },
      { id: 'iss-02', bookId: 'bk-03', studentId: 'std-02', issueDate: '2026-10-01', dueDate: '2026-10-15', fineAmount: 250, status: 'OVERDUE' },
      { id: 'iss-03', bookId: 'bk-02', studentId: 'std-03', issueDate: '2026-09-25', dueDate: '2026-10-09', returnDate: '2026-10-08', fineAmount: 0, status: 'RETURNED' },
    ],
    transportRoutes: [
      { id: 'trp-01', routeCode: 'RT-01', routeName: 'Kando Lund Central & Main Road Corridor', stops: 'Main Stop · Canal Bridge · Market Chowk · Campus Gate', vehicleNo: 'SD-4821 (Coaster)', driverName: 'Muhammad Akram', driverPhone: '+92-301-4421900', monthlyFee: 4500, capacity: 28 },
      { id: 'trp-02', routeCode: 'RT-02', routeName: 'Johi Link Road & Surroundings', stops: 'Johi Bypass · Station Stop · Post Office · Campus Gate', vehicleNo: 'SD-7710 (Hiace)', driverName: 'Ghulam Abbas', driverPhone: '+92-302-9910422', monthlyFee: 4800, capacity: 18 },
      { id: 'trp-03', routeCode: 'RT-03', routeName: 'Dadu City Shuttle Route', stops: 'Dadu Chowk · College Road · Bypass Stop · Campus Gate', vehicleNo: 'SD-9104 (Coaster)', driverName: 'Zafarullah Khan', driverPhone: '+92-333-6102944', monthlyFee: 5200, capacity: 30 },
    ],
    hostelRooms: [
      { id: 'hst-01', blockName: 'Scholars Hostel Block A', roomNo: 'HB-101', roomType: 'Twin Sharing', capacity: 2, monthlyFee: 14000, wardenName: 'Sohail Anwar' },
      { id: 'hst-02', blockName: 'Scholars Hostel Block A', roomNo: 'HB-102', roomType: 'Standard 3-Bed', capacity: 3, monthlyFee: 12500, wardenName: 'Sohail Anwar' },
      { id: 'hst-03', blockName: 'Scholars Hostel Block B', roomNo: 'HB-201', roomType: 'Twin Sharing', capacity: 2, monthlyFee: 14500, wardenName: 'Abdul Karim' },
    ],
    inventory: [
      { id: 'inv-01', itemCode: 'STK-PHY-01', name: 'Digital Vernier Calipers & Micrometers', category: 'Lab Equipment', quantity: 26, minThreshold: 10, unit: 'Sets', location: 'Physics Lab-01', lastRestocked: '2026-09-12' },
      { id: 'inv-02', itemCode: 'STK-CHM-04', name: 'Borosilicate Titration Burettes (50ml)', category: 'Lab Equipment', quantity: 7, minThreshold: 12, unit: 'Units', location: 'Chemistry Lab-02', lastRestocked: '2026-08-19' },
      { id: 'inv-03', itemCode: 'STK-IT-02', name: 'OptiPlex Lab Workstations (Core i7)', category: 'IT Hardware', quantity: 34, minThreshold: 30, unit: 'Units', location: 'Computer Lab', lastRestocked: '2026-07-05' },
      { id: 'inv-04', itemCode: 'STK-STN-09', name: 'Examination Answer Booklets (24-Page)', category: 'Stationery', quantity: 140, minThreshold: 250, unit: 'Packs', location: 'Exam Strongroom', lastRestocked: '2026-09-28' },
    ],
    activityLogs: [
      {
        id: 'log-00',
        actorId: 'usr-superadmin',
        actorName: 'Shahid Ali',
        actorRole: UserRole.SUPER_ADMIN,
        action: 'Updated Institutional Directory',
        module: 'Administration',
        details: 'Configured faculty roster, student records, and MM-YYYY-NNN roll number format for GBPS: Kando Lund.',
        ipAddress: '192.168.10.10',
        createdAt: '2026-10-24T10:30:00Z',
      },
      {
        id: 'log-01',
        actorId: 'usr-principal',
        actorName: 'Dr. Anwar Baloch',
        actorRole: UserRole.ADMIN,
        action: 'Published Exam Results',
        module: 'Exams & Results',
        details: 'Published Midterm Assessment 2026 grades and class positions for Grade 10 & Grade 9.',
        ipAddress: '192.168.10.14',
        createdAt: '2026-10-17T15:00:00Z',
      },
      {
        id: 'log-02',
        actorId: 'usr-accountant',
        actorName: 'Wazeer Ali Baloch',
        actorRole: UserRole.ACCOUNTANT,
        action: 'Verified Fee Receipt',
        module: 'Fee Management',
        details: 'Confirmed Easypaisa payment EP-449012834 (PKR 25,950) for Voucher VCH-202610-103 (Ahsan Ali).',
        ipAddress: '192.168.10.22',
        createdAt: '2026-10-09T14:06:00Z',
      },
      {
        id: 'log-03',
        actorId: 'usr-teacher',
        actorName: 'Majid Ali',
        actorRole: UserRole.TEACHER,
        action: 'Submitted Daily Attendance',
        module: 'Attendance',
        details: 'Recorded attendance for Grade 10-A (2026-10-22) and triggered 1 Parent SMS notification.',
        ipAddress: '192.168.10.45',
        createdAt: '2026-10-22T08:35:00Z',
      },
    ],
  };

  ensureLmsSchemaAndRoles(seeded);
  return seeded;
}

class RelationalStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          const migrated = ensureLmsSchemaAndRoles(parsed);
          if (migrated) {
            this.saveToDisk(parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading persisted database, re-initializing seed data:', err);
    }
    const seeded = generateSeedDatabase();
    this.saveToDisk(seeded);
    return seeded;
  }

  private saveToDisk(snapshot: DatabaseSchema = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database snapshot:', err);
    }
  }

  public getState(): DatabaseSchema {
    return this.data;
  }

  public commit(): void {
    this.saveToDisk(this.data);
  }

  public restoreSnapshot(newData: DatabaseSchema): void {
    this.data = newData;
    this.saveToDisk(this.data);
  }

  public resetToSeed(): DatabaseSchema {
    this.data = generateSeedDatabase();
    this.saveToDisk(this.data);
    return this.data;
  }

  public logActivity(entry: Omit<ActivityLog, 'id' | 'createdAt'>): void {
    this.data.activityLogs.unshift({
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    });
    if (this.data.activityLogs.length > 300) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 300);
    }
    this.commit();
  }
}

export const store = new RelationalStore();

export function calculateGradeInfo(percentage: number): { grade: string; gpa: number; remarks: string } {
  if (percentage >= 90) return { grade: 'A+', gpa: 4.0, remarks: 'Outstanding' };
  if (percentage >= 80) return { grade: 'A', gpa: 3.7, remarks: 'Excellent' };
  if (percentage >= 70) return { grade: 'B', gpa: 3.3, remarks: 'Very Good' };
  if (percentage >= 60) return { grade: 'C', gpa: 2.7, remarks: 'Satisfactory' };
  if (percentage >= 50) return { grade: 'D', gpa: 2.0, remarks: 'Pass' };
  return { grade: 'F', gpa: 0.0, remarks: 'Needs Improvement' };
}
