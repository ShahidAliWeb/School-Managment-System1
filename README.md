# GBPS: Kando Lund — Complete School Management System

A full-stack, role-based **School Management System (SMS)** for **GBPS: Kando Lund**, built with **React 19 + Tailwind CSS v4** on the frontend and **Node.js + Express + JWT + bcryptjs** on the backend, accompanied by a production PostgreSQL relational DDL schema (`database/schema.sql`) and an atomic persistent store (`server/db.ts`) pre-seeded with realistic institutional records across all 6 user roles and 10 modules.

---

## Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Light/Dark theme support, Print-PDF & Excel CSV exporters
- **Backend:** Node.js, Express REST API (`/api/*`), Role-Based Access Control (RBAC) middleware
- **Authentication & Security:** JWT (`jsonwebtoken`) Bearer sessions, 10-round salted password hashing (`bcryptjs`), audit activity logging, JSON database backup & restore
- **Database:** Relational schema in `/database/schema.sql` (PostgreSQL DDL) + embedded persistent JSON relational store (`/data/school_db.json`) for instant zero-config local execution

---

## Project Structure

```text
├── database/
│   └── schema.sql                 # Complete PostgreSQL relational DDL schema & indexes
├── server/
│   ├── db.ts                      # Persistent relational store, bcrypt seed data & grading engine
│   ├── middleware/
│   │   └── auth.ts                # JWT verification & authorizeRoles(...) RBAC middleware
│   └── routes/
│       └── api.ts                 # REST API endpoints covering all 10 modules
├── src/
│   ├── components/
│   │   ├── Layout.tsx             # Responsive sidebar dashboard & role-filtered navigation
│   │   └── ui/
│   │       ├── PaginationBar.tsx  # Reusable pagination & page-size controls
│   │       └── PrintPreviewModal.tsx # Institutional print-PDF engine (Report Cards, SLC, Vouchers, IDs)
│   ├── context/
│   │   ├── AuthContext.tsx        # JWT session & role permission hooks
│   │   ├── ThemeContext.tsx       # Light & Dark mode state
│   │   └── ToastContext.tsx       # Accessible toast notifications
│   ├── lib/
│   │   └── api.ts                 # Typed REST client, PKR currency & Excel CSV exporter
│   ├── pages/
│   │   ├── LoginPage.tsx          # Split-view login + one-click RBAC demo role switcher
│   │   ├── DashboardPage.tsx      # Admin KPIs, Attendance & Fee SVG charts, Notices, Audit feed
│   │   ├── StudentsPage.tsx       # Admissions, Profiles, Document uploads, Promotion & Leaving Certs
│   │   ├── AttendancePage.tsx     # Daily Student/Staff registers, Auto Parent SMS alerts, Monthly PDF/CSV
│   │   ├── AcademicsPage.tsx      # Class/Teacher Timetable, Homework submissions, Syllabus progress
│   │   ├── ExamsPage.tsx          # Datesheet, Marks entry, Auto %/Grade/Position & Printable Report Cards
│   │   ├── FeesPage.tsx           # Fee structures, Vouchers, Defaulters, JazzCash/Easypaisa/Bank gateway
│   │   ├── StaffPage.tsx          # Faculty directory, Salary disbursement & Payslips, Leave approvals
│   │   ├── CommunicationPage.tsx  # Notice board, SMS/WhatsApp/Email gateway logs & PTM scheduling
│   │   ├── PortalPage.tsx         # Dedicated Parent (multi-child switcher) & Student self-service portal
│   │   ├── CampusOpsPage.tsx      # Library, Transport, Hostel, Inventory & Printable ID Cards
│   │   └── SecurityReportsPage.tsx# Activity audit logs, RBAC matrix, Master CSV & DB Backup/Restore
│   └── types/
│       └── index.ts               # Shared TypeScript domain interfaces
└── server.ts                      # Full-stack Express + Vite server entry point (Port 3000)
```

---

## Seeded Demo Accounts (All 6 Roles)

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Shahid Ali | `csd241043@dsu.edu.pk` | `Admin@123` |
| **Admin / Principal** | Dr. Anwar Baloch | `anwar.baloch@gbpskl.edu.pk` | `Admin@123` |
| **Teacher** | Majid Ali | `majid.ali@gbpskl.edu.pk` | `Teacher@123` |
| **Accountant** | Wazeer Ali Baloch | `wazeer.baloch@gbpskl.edu.pk` | `Account@123` |
| **Student** | Kamran Ali (`10-2026-001`) | `kamran.ali@gbpskl.edu.pk` | `Student@123` |
| **Parent** | Tariq Ali (2 Children) | `parent@gbpskl.edu.pk` | `Parent@123` |

---

## Setup & Run Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables (optional):**
   Copy `.env.example` to `.env` and set `JWT_SECRET` and `PORT=3000`.
   *(If deploying against an external PostgreSQL server, initialize tables with `psql -d gbps_kando_lund -f database/schema.sql`.)*

3. **Start the development server (Express API + Vite Frontend on Port 3000):**
   ```bash
   npm run dev
   ```

4. **Type-check & build for production:**
   ```bash
   npm run lint
   npm run build
   npm start
   ```
