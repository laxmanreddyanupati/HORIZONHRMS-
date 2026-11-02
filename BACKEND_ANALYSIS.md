# Backend Analysis — Horizon HRMS

**Date:** 2 November 2026
**Project:** Horizon Technologies HRMS
**Frontend:** React 19 + TypeScript 7 + Vite 8 (repository root)
**Backend:** ASP.NET Core 10 Web API at `backend/HorizonHRMS.Api`
**Database:** SQL Server, database `HorizonHRMS` (dev), `HorizonHRMS_Tests_*` (integration tests)

## 1. Frontend source of truth

- Types: `src/types/index.ts`
- Services: `src/services/*.ts` (admin, attendance, dashboard, employee, expense, leave, organization, payroll, performance, recruitment, report)
- Data: `src/data/*.ts` (employees, attendance, leave, payroll, recruitment, performance, expenses, dashboard, reports, organization, admin)
- Auth/roles: `src/contexts/auth-context.tsx`, `src/contexts/role-context.tsx`, `src/lib/require-access.tsx`, `src/lib/require-auth.tsx`
- API client: `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/auth-storage.ts`, `src/lib/reference-data.ts`

## 2. Backend architecture

Single ASP.NET Core Web API project (pragmatic; Clean Architecture layers collapsed into the API project for delivery speed). Layers within the project:

- `Contracts/Dtos.cs` — request/response DTOs (no entities exposed)
- `Models/Entities.cs`, `Models/Enums` — EF Core entities
- `Data/HrmsDbContext.cs`, `Data/SeedDataLoader.cs`, `Data/Seed/*.json`
- `Infrastructure/` — PasswordService, TokenService, DemoClock, AccessScope, ApiExceptionMiddleware, ApiException
- `Controllers/` — 12 controllers
- `Program.cs` — DI, auth policies, CORS, Swagger, migration/seed

## 3. Database

- EF Core 10 + SQL Server, database `HorizonHRMS`.
- Migration `20261101035628_InitialCreate`.
- Seeded: 128 employees, 10 system users, 11,036 attendance records, 868 payslips, plus departments, designations, branches, leave types/policies, shifts, holidays, expenses, recruitment, performance, settings, audit logs.
- Employees deactivated, never deleted. Leave approval HR-only. Overlapping leave rejected.

## 4. Authentication & authorization

- JWT bearer access tokens (30 min) + rotating refresh tokens (7 days).
- PBKDF2 password hashing (per-user salt).
- Roles: super-admin, hr-admin, hr-executive, manager, payroll-admin, employee.
- Policies: HrStaff, HrAdmin, SuperAdmin, PeopleManagers, PayrollStaff, Operations, RecruitmentEdit, Settings, AnyEmployee.
- Dev: random per-user passwords written to gitignored `.seed-credentials.dev.txt`. Non-Development requires `Seed:UserPasswords`.

## 5. Cross-cutting

- Global exception middleware returning `{ code, message, errors?, traceId }`.
- CORS restricted to configured origins (default `http://localhost:5173`).
- Swagger/OpenAPI in Development.
- DemoClock snapshot date `2026-10-30` via `Demo:SnapshotDate`.

## 6. Frontend integration

- Centralized API client `src/lib/api-client.ts` (token injection, single-flight refresh, retry, typed ApiError, download helper).
- `.env` / `.env.example` with `VITE_API_BASE_URL=http://localhost:5095/api`.
- Role/persona derived from authenticated user; demo role switching removed.
- All 11 services call the API; writes hydrate seeded arrays.
- Notifications remain frontend-only (no backend endpoint).

## 7. Tests

- xUnit integration tests in `backend/HorizonHRMS.Api.Tests` using `WebApplicationFactory<Program>` against a dedicated SQL Server test DB (`HorizonHRMS_Tests_<guid>`), with deterministic `Seed:UserPasswords`.
- 33 tests: health/auth, authorization (role 403), employee CRUD + pagination + validation + deactivation, leave apply/overlap/balance/decision, payroll access scoping, dashboard/reports role denial.
- Result: 33 passed, 0 failed.

## 8. Known limitations

- No SignalR/real-time notifications (notifications are frontend-only demo data).
- No FluentValidation/AutoMapper/Serilog (manual mapping, ASP.NET Core logging).
- No forgot-password/change-password endpoints.
- No receipt file upload endpoint (filename-only).
- Frontend bundle >500 kB chunk warning (pre-existing).
- Lint passes with warnings only.
