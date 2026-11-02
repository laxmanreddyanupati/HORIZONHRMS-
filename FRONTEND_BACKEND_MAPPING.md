# Frontend–Backend Mapping — Horizon HRMS

## Base URL
- Frontend: `VITE_API_BASE_URL=http://localhost:5095/api` (see `.env.example`)
- Backend routes under `/api/*`.

## Services → API

| Frontend service | Backend controller | Notes |
|---|---|---|
| `auth` (auth-context) | `AuthController` | Login/refresh/logout/me; JWT + rotating refresh |
| `employee-service` | `EmployeesController` | CRUD, counts, status change, pagination |
| `organization-service` | `OrganizationController` | Departments, designations, branches, org chart, lookups |
| `attendance-service` | `AttendanceController` | Daily, summary, by employee, check-in/out, corrections |
| `leave-service` | `LeaveController` | Types, policies, requests, balances, decision, cancel |
| `payroll-service` | `PayrollController` | Runs, payslips, salary structures, process/pay, dashboard, download |
| `recruitment-service` | `RecruitmentController` | Jobs, candidates, interviews, summary |
| `performance-service` | `PerformanceController` | Cycles, goals, reviews, feedback, summary |
| `expense-service` | `ExpensesController` | Categories, claims, decision, reimburse, summary |
| `dashboard-service` | `DashboardController` | Overview |
| `report-service` | `ReportsController` | Report list + by id |
| `admin-service` | `AdminController` | Company profile, settings, holidays, users, audit logs, roles |

## Data hydration
- `src/lib/reference-data.ts` hydrates mutable seeded arrays (`@/data`) from reference GET endpoints so synchronous mock lookups still work for seeded/new data.
- Hydration is best-effort and tolerant of 403 per role.

## Role mapping
- Frontend `role-context` derives role/persona from authenticated user (no demo switching).
- Backend policies enforce access: HrStaff, HrAdmin, SuperAdmin, PeopleManagers, PayrollStaff, Operations, RecruitmentEdit, Settings, AnyEmployee.

## Field mapping notes
- `JobRequest.Status`, `JobRequest.HiringManagerId`, `InterviewRequest.JobId`, `UpdateUserRequest.Role/Status` are optional; PATCH/PUT merge with existing record.
- Expense receipts: filename-only (`receiptName`); no upload endpoint; download repurposed as generated claim summary.
- Leave approval HR-only (HrStaff); overlapping approved/pending leave rejected.
- Payroll statutory rates are illustrative/configurable, not legal.
- DateOnly serialized as `yyyy-MM-dd`; `SystemUserDto.lastActive` as `yyyy-MM-ddTHH:mm:ss` or `-`.
- Attendance employee endpoint uses 0-based `month`.

## Auth flow
- `POST /api/auth/login` → `{ accessToken, refreshToken, accessTokenExpiresAt, user }`.
- Frontend stores tokens in `auth-storage`, injects bearer, single-flight refresh on 401, retries original request.
- Session expiry clears tokens and redirects to login.

## Employee self-service scoping
- Employee-safe payroll endpoints: `/payroll/employees/{employeeId}/payslips`, `/payroll/salary-structures/{employeeId}`, `/payroll/runs/{runId}/payslips/{employeeId}`, `/payroll/payslips/{employeeId}/{runId}/download`.
- `fetchPayrollRun` for employees derives run metadata from the employee’s own payslip.
- Payroll staff use `/payroll/runs/{runId}`.

## Notifications
- Remain frontend-only demo data (no backend notifications endpoint).
