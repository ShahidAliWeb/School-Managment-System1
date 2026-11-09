-- =============================================================================
-- GBPS: Kando Lund School Management System — Relational PostgreSQL Schema (DDL)
-- Professional Production Standards:
-- - Full Name: VARCHAR(100) with letters, spaces, hyphens, and apostrophes only
-- - Email Address: VARCHAR(254) RFC compliant, UNIQUE, normalized lowercase
-- - Phone Number: VARCHAR(20) E.164 normalized (+92... default)
-- - Date of Birth: DATE, strictly past date with reasonable age bounds
-- - Address: VARCHAR(255) / TEXT with meaningful structure
-- - Strict Foreign Keys, CHECK Constraints, Enums, Timestamps
-- =============================================================================

-- Drop existing tables and types if re-initializing
-- DROP TABLE IF EXISTS activity_logs, inventory_items, hostel_rooms, transport_routes, library_issues, library_books, ptm_schedules, communication_logs, notices, leave_requests, payroll_records, fee_vouchers, fee_structures, exam_marks, exams, staff_attendance, student_attendance, syllabus_plans, homework, timetable_slots, subjects, students, staff, school_classes, users CASCADE;

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'STUDENT',
  'PARENT'
);

CREATE TYPE student_status AS ENUM ('ACTIVE', 'PROMOTED', 'TRANSFERRED', 'ALUMNI');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE');
CREATE TYPE voucher_status AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'OVERDUE');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');

-- 1. Users & Role-Based Access Control
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  login_id VARCHAR(50) UNIQUE,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2 AND name ~* '^[A-Za-zÀ-ÖØ-öø-ÿ]+([ ''-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$'),
  email VARCHAR(254) UNIQUE NOT NULL CHECK (email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$'),
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  phone VARCHAR(20) CHECK (phone IS NULL OR phone ~* '^\+[1-9][0-9]{7,14}$'),
  avatar_url VARCHAR(2048),
  linked_student_ids TEXT[] DEFAULT '{}',
  linked_staff_id VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_login_id ON users(login_id);
CREATE INDEX idx_users_role ON users(role);

-- 2. Classes & Sections
CREATE TABLE school_classes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL CHECK (length(trim(name)) >= 2),         -- e.g., 'Class 10th'
  section VARCHAR(16) NOT NULL CHECK (length(trim(section)) >= 1),     -- e.g., 'A'
  room_number VARCHAR(32) NOT NULL,
  class_teacher_id VARCHAR(64),
  capacity INT NOT NULL DEFAULT 35 CHECK (capacity > 0 AND capacity <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (name, section)
);

-- 3. Staff & HR Records
CREATE TABLE staff (
  id VARCHAR(64) PRIMARY KEY,
  employee_code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2 AND name ~* '^[A-Za-zÀ-ÖØ-öø-ÿ]+([ ''-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$'),
  email VARCHAR(254) UNIQUE NOT NULL CHECK (email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$'),
  phone VARCHAR(20) NOT NULL CHECK (phone ~* '^\+[1-9][0-9]{7,14}$'),
  designation VARCHAR(80) NOT NULL CHECK (length(trim(designation)) >= 2),
  department VARCHAR(80) NOT NULL CHECK (length(trim(department)) >= 2),
  qualification VARCHAR(120) NOT NULL CHECK (length(trim(qualification)) >= 2),
  join_date DATE NOT NULL CHECK (join_date <= CURRENT_DATE),
  base_salary DECIMAL(10, 2) NOT NULL CHECK (base_salary >= 0),
  allowances DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (allowances >= 0),
  status VARCHAR(24) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'RESIGNED')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_code ON staff(employee_code);

-- 4. Students & Guardian Records
CREATE TABLE students (
  id VARCHAR(64) PRIMARY KEY,
  admission_no VARCHAR(32) UNIQUE NOT NULL,
  roll_no VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2 AND name ~* '^[A-Za-zÀ-ÖØ-öø-ÿ]+([ ''-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$'),
  gender gender_type NOT NULL,
  dob DATE NOT NULL CHECK (dob < CURRENT_DATE AND dob >= (CURRENT_DATE - INTERVAL '25 years') AND dob <= (CURRENT_DATE - INTERVAL '3 years')),
  blood_group VARCHAR(8) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  section VARCHAR(16) NOT NULL,
  admission_date DATE NOT NULL CHECK (admission_date <= CURRENT_DATE),
  status student_status DEFAULT 'ACTIVE' NOT NULL,
  address VARCHAR(255) NOT NULL CHECK (length(trim(address)) >= 5 AND address ~* '[A-Za-z]'),
  guardian_name VARCHAR(100) NOT NULL CHECK (length(trim(guardian_name)) >= 2 AND guardian_name ~* '^[A-Za-zÀ-ÖØ-öø-ÿ]+([ ''-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$'),
  guardian_relation VARCHAR(40) NOT NULL CHECK (length(trim(guardian_relation)) >= 2),
  guardian_phone VARCHAR(20) NOT NULL CHECK (guardian_phone ~* '^\+[1-9][0-9]{7,14}$'),
  guardian_email VARCHAR(254) NOT NULL CHECK (guardian_email ~* '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$'),
  guardian_cnic VARCHAR(32) CHECK (guardian_cnic IS NULL OR guardian_cnic = '' OR guardian_cnic ~* '^\d{5}-\d{7}-\d{1}$'),
  scholarship_percent DECIMAL(5, 2) DEFAULT 0.00 NOT NULL CHECK (scholarship_percent >= 0.00 AND scholarship_percent <= 100.00),
  transport_route_id VARCHAR(64),
  hostel_room_id VARCHAR(64),
  documents JSONB DEFAULT '[]' NOT NULL,
  leaving_certificate JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_roll_no ON students(roll_no);

-- 5. Subjects, Timetable, Homework & Syllabus
CREATE TABLE subjects (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(24) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2),
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
  total_marks INT DEFAULT 100 NOT NULL CHECK (total_marks > 0),
  passing_marks INT DEFAULT 40 NOT NULL CHECK (passing_marks > 0 AND passing_marks <= total_marks)
);

CREATE TABLE timetable_slots (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  day_of_week VARCHAR(16) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  period_no INT NOT NULL CHECK (period_no >= 1 AND period_no <= 12),
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  room VARCHAR(32) NOT NULL
);

CREATE TABLE homework (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL CHECK (length(trim(title)) >= 3),
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  max_marks INT DEFAULT 20 NOT NULL CHECK (max_marks > 0),
  attachment_name VARCHAR(255),
  submissions JSONB DEFAULT '[]' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE syllabus_plans (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term VARCHAR(48) NOT NULL,
  unit_title VARCHAR(160) NOT NULL,
  topics TEXT NOT NULL,
  completion_percent INT DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  target_date DATE NOT NULL
);

-- 6. LMS Lectures & Online Quizzes
CREATE TABLE lms_lectures (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  teacher_name VARCHAR(100) NOT NULL,
  title VARCHAR(180) NOT NULL CHECK (length(trim(title)) >= 3),
  topic VARCHAR(120) NOT NULL,
  duration_mins INT NOT NULL CHECK (duration_mins > 0),
  video_url VARCHAR(2048),
  notes TEXT NOT NULL,
  completed_student_ids TEXT[] DEFAULT '{}' NOT NULL,
  published_at DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE lms_quizzes (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  teacher_name VARCHAR(100) NOT NULL,
  title VARCHAR(180) NOT NULL CHECK (length(trim(title)) >= 3),
  instructions TEXT NOT NULL,
  duration_mins INT NOT NULL CHECK (duration_mins >= 5 AND duration_mins <= 180),
  due_date DATE NOT NULL,
  total_marks INT NOT NULL CHECK (total_marks > 0),
  questions JSONB NOT NULL,
  attempts JSONB DEFAULT '[]' NOT NULL,
  status VARCHAR(24) DEFAULT 'PUBLISHED' NOT NULL CHECK (status IN ('PUBLISHED', 'CLOSED')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Daily Attendance (Students & Staff)
CREATE TABLE student_attendance (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id),
  date DATE NOT NULL CHECK (date <= CURRENT_DATE),
  status attendance_status NOT NULL,
  remarks TEXT,
  marked_by VARCHAR(100) NOT NULL,
  notified_parent BOOLEAN DEFAULT FALSE NOT NULL,
  UNIQUE (student_id, date)
);

CREATE TABLE staff_attendance (
  id VARCHAR(64) PRIMARY KEY,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL CHECK (date <= CURRENT_DATE),
  status attendance_status NOT NULL,
  check_in VARCHAR(16),
  remarks TEXT,
  UNIQUE (staff_id, date)
);

-- 8. Exams, Datesheet & Marks
CREATE TABLE exams (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  term VARCHAR(64) NOT NULL,
  academic_year VARCHAR(16) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  status VARCHAR(24) DEFAULT 'SCHEDULED' NOT NULL,
  datesheet JSONB DEFAULT '[]' NOT NULL
);

CREATE TABLE exam_marks (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(6, 2) NOT NULL CHECK (marks_obtained >= 0),
  max_marks DECIMAL(6, 2) NOT NULL CHECK (max_marks > 0 AND marks_obtained <= max_marks),
  remarks VARCHAR(160),
  UNIQUE (exam_id, student_id, subject_id)
);

-- 9. Fee Management
CREATE TABLE fee_structures (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) UNIQUE NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  tuition_fee DECIMAL(10, 2) NOT NULL CHECK (tuition_fee >= 0),
  lab_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (lab_fee >= 0),
  library_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (library_fee >= 0),
  exam_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (exam_fee >= 0),
  late_fine_per_day DECIMAL(10, 2) DEFAULT 100.00 NOT NULL CHECK (late_fine_per_day >= 0)
);

CREATE TABLE fee_vouchers (
  id VARCHAR(64) PRIMARY KEY,
  voucher_no VARCHAR(40) UNIQUE NOT NULL,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES school_classes(id),
  billing_month VARCHAR(32) NOT NULL,
  due_date DATE NOT NULL,
  base_amount DECIMAL(10, 2) NOT NULL CHECK (base_amount >= 0),
  transport_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (transport_fee >= 0),
  hostel_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (hostel_fee >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (discount_amount >= 0),
  late_fine DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (late_fine >= 0),
  net_amount DECIMAL(10, 2) NOT NULL CHECK (net_amount >= 0),
  paid_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (paid_amount >= 0 AND paid_amount <= net_amount),
  status voucher_status DEFAULT 'UNPAID' NOT NULL,
  payment_method VARCHAR(32),
  payment_reference VARCHAR(80),
  paid_at TIMESTAMPTZ
);

-- 10. Staff Payroll & Leave Requests
CREATE TABLE payroll_records (
  id VARCHAR(64) PRIMARY KEY,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month VARCHAR(32) NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL CHECK (base_salary >= 0),
  allowances DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (allowances >= 0),
  deductions DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (deductions >= 0),
  net_salary DECIMAL(10, 2) NOT NULL CHECK (net_salary >= 0),
  status VARCHAR(24) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PAID', 'PENDING')),
  paid_on DATE,
  UNIQUE (staff_id, month)
);

CREATE TABLE leave_requests (
  id VARCHAR(64) PRIMARY KEY,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  leave_type VARCHAR(40) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL CHECK (to_date >= from_date),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 5),
  status leave_status DEFAULT 'PENDING' NOT NULL,
  reviewed_by VARCHAR(100)
);

-- 11. Communication, Campus Operations & Audit Logs
CREATE TABLE notices (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(180) NOT NULL CHECK (length(trim(title)) >= 3),
  content TEXT NOT NULL CHECK (length(trim(content)) >= 5),
  audience VARCHAR(40) NOT NULL CHECK (audience IN ('ALL', 'PARENTS', 'STUDENTS', 'TEACHERS')),
  category VARCHAR(40) NOT NULL,
  published_by VARCHAR(100) NOT NULL,
  publish_date DATE NOT NULL
);

CREATE TABLE communication_logs (
  id VARCHAR(64) PRIMARY KEY,
  channel VARCHAR(24) NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL')),
  recipient_name VARCHAR(100) NOT NULL,
  recipient_contact VARCHAR(100) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL CHECK (length(trim(message)) >= 1),
  status VARCHAR(24) DEFAULT 'DELIVERED' NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE ptm_schedules (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  date DATE NOT NULL,
  time_slot VARCHAR(48) NOT NULL,
  class_id VARCHAR(64) REFERENCES school_classes(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) REFERENCES staff(id) ON DELETE RESTRICT,
  room VARCHAR(40) NOT NULL,
  notes TEXT
);

CREATE TABLE library_books (
  id VARCHAR(64) PRIMARY KEY,
  isbn VARCHAR(32) UNIQUE NOT NULL,
  title VARCHAR(180) NOT NULL,
  author VARCHAR(100) NOT NULL,
  category VARCHAR(64) NOT NULL,
  total_copies INT NOT NULL CHECK (total_copies > 0),
  available_copies INT NOT NULL CHECK (available_copies >= 0 AND available_copies <= total_copies),
  shelf_location VARCHAR(32) NOT NULL
);

CREATE TABLE library_issues (
  id VARCHAR(64) PRIMARY KEY,
  book_id VARCHAR(64) NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL CHECK (due_date >= issue_date),
  return_date DATE,
  fine_amount DECIMAL(8, 2) DEFAULT 0.00 NOT NULL CHECK (fine_amount >= 0),
  status VARCHAR(24) DEFAULT 'ISSUED' NOT NULL CHECK (status IN ('ISSUED', 'RETURNED', 'OVERDUE'))
);

CREATE TABLE transport_routes (
  id VARCHAR(64) PRIMARY KEY,
  route_code VARCHAR(24) UNIQUE NOT NULL,
  route_name VARCHAR(120) NOT NULL,
  stops TEXT NOT NULL,
  vehicle_no VARCHAR(32) NOT NULL,
  driver_name VARCHAR(100) NOT NULL CHECK (driver_name ~* '^[A-Za-zÀ-ÖØ-öø-ÿ]+([ ''-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$'),
  driver_phone VARCHAR(20) NOT NULL CHECK (driver_phone ~* '^\+[1-9][0-9]{7,14}$'),
  monthly_fee DECIMAL(10, 2) NOT NULL CHECK (monthly_fee >= 0),
  capacity INT NOT NULL CHECK (capacity > 0)
);

CREATE TABLE hostel_rooms (
  id VARCHAR(64) PRIMARY KEY,
  block_name VARCHAR(64) NOT NULL,
  room_no VARCHAR(24) UNIQUE NOT NULL,
  room_type VARCHAR(32) NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  monthly_fee DECIMAL(10, 2) NOT NULL CHECK (monthly_fee >= 0),
  warden_name VARCHAR(100) NOT NULL CHECK (warden_name ~* '^[A-Za-zÀ-ÖØ-öø-ÿ]+([ ''-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$')
);

CREATE TABLE inventory_items (
  id VARCHAR(64) PRIMARY KEY,
  item_code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(140) NOT NULL,
  category VARCHAR(64) NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 0),
  min_threshold INT NOT NULL DEFAULT 10 CHECK (min_threshold >= 0),
  unit VARCHAR(24) NOT NULL,
  location VARCHAR(80) NOT NULL,
  last_restocked DATE NOT NULL
);

CREATE TABLE activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  actor_role user_role NOT NULL,
  action VARCHAR(120) NOT NULL,
  module VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
