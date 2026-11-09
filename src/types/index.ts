export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export type StudentStatus = 'ACTIVE' | 'PROMOTED' | 'TRANSFERRED' | 'ALUMNI';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
export type VoucherStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserAccount {
  id: string;
  loginId?: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  linkedStudentIds: string[];
  linkedStaffId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  section: string;
  roomNumber: string;
  classTeacherId: string;
  capacity: number;
}

export interface StudentDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  verified: boolean;
}

export interface LeavingCertificate {
  certificateNo: string;
  issueDate: string;
  leavingType: 'TRANSFER' | 'GRADUATION' | 'WITHDRAWAL';
  reason: string;
  conduct: string;
  lastClassAttended: string;
  issuedBy: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  rollNo: string;
  name: string;
  gender: 'Male' | 'Female';
  dob: string;
  bloodGroup: string;
  classId: string;
  section: string;
  admissionDate: string;
  status: StudentStatus;
  address: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianCnic: string;
  scholarshipPercent: number;
  transportRouteId?: string;
  hostelRoomId?: string;
  documents: StudentDocument[];
  leavingCertificate?: LeavingCertificate;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  qualification: string;
  joinDate: string;
  baseSalary: number;
  allowances: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  classId: string;
  teacherId: string;
  totalMarks: number;
  passingMarks: number;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNo: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  room: string;
}

export interface HomeworkSubmission {
  studentId: string;
  studentName: string;
  submittedAt: string;
  notes: string;
  attachmentName: string;
  status: 'SUBMITTED' | 'GRADED';
  marks?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export interface Homework {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks?: number;
  attachmentName?: string;
  submissions: HomeworkSubmission[];
  createdAt: string;
}

export interface LmsLecture {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  topic: string;
  durationMins: number;
  videoUrl?: string;
  notes: string;
  completedStudentIds: string[];
  publishedAt: string;
}

export interface LmsQuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

export interface LmsQuizAttempt {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  answers: number[];
  score: number;
  totalMarks: number;
  percentage: number;
  submittedAt: string;
  teacherRemarks?: string;
}

export interface LmsQuiz {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  instructions: string;
  durationMins: number;
  dueDate: string;
  totalMarks: number;
  questions: LmsQuizQuestion[];
  attempts: LmsQuizAttempt[];
  status: 'PUBLISHED' | 'CLOSED';
  createdAt: string;
}

export interface SyllabusPlan {
  id: string;
  classId: string;
  subjectId: string;
  term: string;
  unitTitle: string;
  topics: string;
  completionPercent: number;
  targetDate: string;
}

export interface StudentAttendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  markedBy: string;
  notifiedParent: boolean;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  remarks?: string;
}

export interface DatesheetEntry {
  subjectId: string;
  subjectName: string;
  classId: string;
  examDate: string;
  startTime: string;
  durationMins: number;
  room: string;
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'SCHEDULED' | 'ONGOING' | 'PUBLISHED';
  datesheet: DatesheetEntry[];
}

export interface ExamMark {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained: number;
  maxMarks: number;
  remarks?: string;
}

export interface SubjectMarkBreakdown {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  remarks: string;
}

export interface ExamStanding {
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
  subjectBreakdown: SubjectMarkBreakdown[];
}

export interface FeeStructure {
  id: string;
  classId: string;
  tuitionFee: number;
  labFee: number;
  libraryFee: number;
  examFee: number;
  lateFinePerDay: number;
}

export interface FeeVoucher {
  id: string;
  voucherNo: string;
  studentId: string;
  classId: string;
  billingMonth: string;
  dueDate: string;
  baseAmount: number;
  transportFee: number;
  hostelFee: number;
  discountAmount: number;
  lateFine: number;
  netAmount: number;
  paidAmount: number;
  status: VoucherStatus;
  paymentMethod?: 'Cash' | 'JazzCash' | 'Easypaisa' | 'Bank Transfer';
  paymentReference?: string;
  paidAt?: string;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'PAID' | 'PENDING';
  paidOn?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  leaveType: 'Sick Leave' | 'Casual Leave' | 'Academic Leave' | 'Annual Leave';
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  audience: 'ALL' | 'TEACHERS' | 'PARENTS' | 'STUDENTS';
  category: 'Academic' | 'Examination' | 'Event' | 'Holiday' | 'Fee';
  publishedBy: string;
  publishDate: string;
}

export interface CommunicationLog {
  id: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  recipientName: string;
  recipientContact: string;
  subject: string;
  message: string;
  status: 'DELIVERED' | 'QUEUED';
  sentAt: string;
}

export interface PtmSchedule {
  id: string;
  title: string;
  date: string;
  timeSlot: string;
  classId: string;
  teacherId: string;
  room: string;
  notes: string;
}

export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
}

export interface LibraryIssue {
  id: string;
  bookId: string;
  studentId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount: number;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
}

export interface TransportRoute {
  id: string;
  routeCode: string;
  routeName: string;
  stops: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  monthlyFee: number;
  capacity: number;
}

export interface HostelRoom {
  id: string;
  blockName: string;
  roomNo: string;
  roomType: 'Standard 3-Bed' | 'Twin Sharing' | 'Single Study';
  capacity: number;
  monthlyFee: number;
  wardenName: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: 'Lab Equipment' | 'Stationery' | 'IT Hardware' | 'Furniture' | 'Sports';
  quantity: number;
  minThreshold: number;
  unit: string;
  location: string;
  lastRestocked: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserAccount[];
  classes: SchoolClass[];
  students: Student[];
  staff: StaffMember[];
  subjects: Subject[];
  timetable: TimetableSlot[];
  homework: Homework[];
  lectures: LmsLecture[];
  quizzes: LmsQuiz[];
  syllabus: SyllabusPlan[];
  studentAttendance: StudentAttendance[];
  staffAttendance: StaffAttendance[];
  exams: Exam[];
  examMarks: ExamMark[];
  feeStructures: FeeStructure[];
  feeVouchers: FeeVoucher[];
  payroll: PayrollRecord[];
  leaveRequests: LeaveRequest[];
  notices: Notice[];
  communicationLogs: CommunicationLog[];
  ptmSchedules: PtmSchedule[];
  libraryBooks: LibraryBook[];
  libraryIssues: LibraryIssue[];
  transportRoutes: TransportRoute[];
  hostelRooms: HostelRoom[];
  inventory: InventoryItem[];
  activityLogs: ActivityLog[];
}
