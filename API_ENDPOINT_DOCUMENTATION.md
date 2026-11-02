# API Endpoint Documentation — Horizon HRMS

Base URL: `http://localhost:5095/api` (configurable via `VITE_API_BASE_URL`).
All endpoints except `/api/auth/login` and `/api/auth/refresh` require `Authorization: Bearer <accessToken>`.
Errors: `{ code, message, errors?, traceId }`.

## Authentication (`/api/auth`)
- `POST /login` — body `{ email, password }` → `AuthResponse` (accessToken, refreshToken, accessTokenExpiresAt, user)
- `POST /refresh` — body `{ refreshToken }` → `AuthResponse`
- `POST /logout` — body `{ refreshToken }` → 204
- `GET /me` → `SystemUserDto`

## Employees (`/api/employees`)
- `GET /` — query: page, pageSize, search, departmentId, status, employmentType, managerId, sortBy, sortDir
- `GET /counts` → `{ total, active, probation, onLeave, inactive }`
- `GET /{id}` → `EmployeeDto`
- `POST /` (HrStaff) — body `EmployeeUpsertRequest` → 201 `EmployeeDto`
- `PUT /{id}` (HrStaff) → `EmployeeDto`
- `PATCH /{id}/status` (HrStaff) — body `{ status }` → `EmployeeDto`

## Organization (`/api/organization`)
- `GET /departments`, `POST /departments` (HrStaff), `PUT /departments/{id}` (HrStaff), `DELETE /departments/{id}` (HrStaff)
- `GET /designations`, `POST /designations` (HrStaff), `PUT /designations/{id}` (HrStaff), `DELETE /designations/{id}` (HrStaff)
- `GET /branches`, `POST /branches` (HrStaff), `PUT /branches/{id}` (HrStaff), `DELETE /branches/{id}` (HrStaff)
- `GET /org-chart`, `GET /reporting-lines`, `GET /lookups`

## Attendance (`/api/attendance`)
- `GET /daily` — query date, departmentId, status, search, managerId
- `GET /summary` — query date
- `GET /employee/{employeeId}` — query month (0-based), year
- `GET /today/{employeeId}`
- `POST /check-in`, `POST /check-out` — body `{ employeeId? }`
- `GET /corrections`, `POST /corrections`, `POST /corrections/{id}/decision` (PeopleManagers)
- `GET /shifts`, `GET /holidays`, `GET /holidays/{date}`

## Leave (`/api/leave`)
- `GET /types`, `GET /policies`
- `GET /requests` — query status, employeeId, managerId, leaveTypeId, search
- `GET /balances/{employeeId}`, `GET /balances`
- `POST /requests` — body `LeaveApplicationRequest` → 201
- `POST /requests/{id}/decision` (HrStaff) — body `{ status, note? }`
- `POST /requests/{id}/cancel`
- `GET /summary`

## Payroll (`/api/payroll`)
- `GET /runs` (PayrollStaff), `GET /runs/{runId}` (PayrollStaff), `GET /runs/{runId}/payslips` (PayrollStaff)
- `GET /runs/{runId}/payslips/{employeeId}` (PayrollStaff)
- `GET /employees/{employeeId}/payslips` (own or PayrollStaff)
- `GET /salary-structures` (PayrollStaff), `GET /salary-structures/{employeeId}`
- `POST /runs/{runId}/process` (PayrollStaff), `POST /runs/{runId}/pay` (PayrollStaff)
- `GET /dashboard` (PayrollStaff)
- `GET /payslips/{employeeId}/{runId}/download` → file

## Recruitment (`/api/recruitment`)
- `GET /jobs`, `GET /jobs/{id}`, `POST /jobs` (RecruitmentEdit), `PUT /jobs/{id}` (RecruitmentEdit), `PATCH /jobs/{id}/status` (RecruitmentEdit)
- `GET /candidates`, `PATCH /candidates/{id}` (RecruitmentEdit)
- `GET /interviews`, `POST /interviews` (RecruitmentEdit), `PATCH /interviews/{id}` (RecruitmentEdit)
- `GET /summary`

## Performance (`/api/performance`)
- `GET /cycles`, `GET /goals`, `POST /goals` (PeopleManagers), `PATCH /goals/{id}/progress`
- `GET /reviews`, `POST /reviews` (PeopleManagers)
- `GET /feedback`, `POST /feedback` (PeopleManagers)
- `GET /summary`

## Expenses (`/api/expenses`)
- `GET /categories`, `GET /` (scoped), `POST /`, `POST /{id}/decision` (Operations), `POST /{id}/reimburse` (Operations), `GET /summary`

## Dashboard (`/api/dashboard`)
- `GET /overview` → `DashboardOverviewDto`

## Reports (`/api/reports`) (Operations)
- `GET /`, `GET /{id}`

## Admin (`/api/admin`)
- `GET /company-profile`, `PUT /company-profile` (Settings)
- `GET /notification-preferences`, `PATCH /notification-preferences/{id}` (Settings)
- `GET /attendance-settings`, `PUT /attendance-settings` (Settings)
- `GET /payroll-settings`, `PUT /payroll-settings` (Settings)
- `GET /leave-policies`, `PUT /leave-policies/{leaveTypeId}` (Settings)
- `GET /holidays`, `POST /holidays` (Settings), `DELETE /holidays/{id}` (Settings)
- `GET /roles` (Settings), `GET /audit-logs` (HrAdmin), `GET /users` (HrAdmin)
- `POST /users/invite` (HrAdmin), `PATCH /users/{id}` (HrAdmin), `PATCH /users/{id}/mfa` (HrAdmin)
- `GET /branches`, `GET /departments`, `GET /designations`

## Health
- `GET /health` (anonymous) → `{ status, service, utc }`
