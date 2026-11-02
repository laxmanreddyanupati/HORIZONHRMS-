# Horizon HRMS — Frontend Demo

A responsive, frontend-only Human Resource Management System demo for the fictional company
**Horizon Technologies Pvt. Ltd.** It is a portfolio/demonstration build: there is no backend,
no real authentication, no external services and no real employee or payroll data.

> **Demo disclaimer:** Every employee, candidate, salary, payslip, attendance record and metric in
> this application is fictional and generated for demonstration. Payroll figures are illustrative
> only and are **not** legally compliant calculations. The role switcher is a presentation aid, not a
> security boundary.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
```

Requirements: Node.js 20+ (developed against current Node), npm.

---

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, hand-built shadcn-style components on Radix primitives |
| Routing | React Router v7 (`createHashRouter` for static-host-safe deep links) |
| Data | TanStack Query over in-memory mock services |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Dates / currency | date-fns, `Intl.NumberFormat` (INR) |
| Icons | Lucide React |
| Notifications | Sonner |

---

## Modules

| Module | What is included |
| --- | --- |
| **Dashboard** | Headcount and attrition metrics, department and growth charts, attendance snapshot, payroll summary, activity feed, celebrations, holidays, quick actions, demo notices. |
| **Employees** | Searchable/filterable directory with pagination and CSV export, add/edit form with Zod validation, full profile with 8 tabs (overview, employment, attendance, leave, payroll, documents, performance, bank/statutory), deactivate/reactivate, masking of sensitive fields. |
| **Organization** | Company overview, departments, designations, branches, and a recursive org chart. CRUD dialogs with dependency checks and HQ delete protection. |
| **Attendance** | Daily register, correction requests and approvals, personal attendance calendar with simulated check-in/out, shifts and holidays. Manager views are scoped to direct reports. |
| **Leave** | Request queue, my leave with balance cards, leave policies. Apply, approve, reject and cancel flows with role/manager scoping. |
| **Payroll** | Role-aware overview, payroll runs, payslips, salary structures and statutory rules view. Process and mark-paid actions with confirmation, payslip detail/download page, visible demo disclaimers. |
| **Recruitment** | Pipeline overview, job openings CRUD and status changes, candidate pipeline with stage/rating/notes, interview scheduling and feedback. |
| **Performance** | Overview, goals with progress updates, review cycles/submissions, peer feedback. Employee and manager scoping. |
| **Expenses** | Summary cards, role-scoped claim tables, submit claim with receipt download, approve/reject/reimburse actions, category management. |
| **Reports** | Six report types (headcount, department, attendance, leave, payroll, recruitment) with summary cards, dynamic tables, charts and CSV export. |
| **Settings** | Company profile, attendance, payroll, leave policies, holidays, notifications and role permissions. Payroll tab restricted by role. |
| **User Management** | Account table, filters, invite flow, role/status/MFA controls, permission matrix. |
| **Audit Logs** | Filterable audit trail, record detail dialog and CSV export. |

A 404 page and a self-service **Profile** page (persona-aware, with sensitive-field masking) are also
included.

---

## Simulated roles

Switch roles from the header **role switcher** (or the Settings > Roles tab). The choice is stored in
`localStorage`, and navigation/actions update immediately. If the active page becomes inaccessible,
the app redirects to the dashboard.

| Role | Demo persona | Typical access |
| --- | --- | --- |
| Super Admin | Kavita Rao (admin account) | Everything, including user management and audit logs. |
| HR Admin | Priya Menon (`HZT-0002`) | People ops, org setup, recruitment, reports, settings, users, audit. Payroll is view-only. |
| HR Executive | Sneha Reddy (`HZT-0006`) | Employee records, organization, recruitment, attendance, leave, reports. |
| Manager | Rohan Iyer (`HZT-0003`) | Own team’s attendance, leave approvals, performance and expenses; org metrics. |
| Payroll Admin | Meera Joshi (`HZT-0008`) | Payroll processing, salary structures, statutory view, payroll reports. |
| Employee | Arjun Nair (`HZT-0005`) | Self-service: own attendance, leave, payslips, goals, feedback and expenses. |

Module access and action permissions are defined in `src/lib/constants.ts`
(`MODULE_ACCESS`, `*_EDIT_ROLES`, `SENSITIVE_ROLES`, etc.) and enforced by
`RequireAccess` plus per-screen guards. These are **simulated** UI restrictions and are clearly
labelled as demo behavior in the interface.

---

## Demo data and snapshot

- Fixed snapshot date: **30 Oct 2026** (`DEMO_SNAPSHOT_DATE` in `src/lib/utils.ts`) so attendance,
  leave and payroll screens stay coherent.
- **128 employees**: ten hand-authored records (`HZT-0001`–`HZT-0010`) plus deterministic generated
  records. IDs are stable across reloads.
- Currency INR, dates shown as `DD MMM YYYY`, timezone Asia/Kolkata, monthly payroll, financial year
  April–March.
- Mock records live in `src/data/` and are mutated in memory by the services in `src/services/`.
  **Changes reset on reload.** Only the active role persists (`localStorage` key
  `horizon-demo-role`).
- All metrics are labelled as demo figures; none represent real people or performance.

---

## Architecture

```
src/
  app/          Router and providers (Query client, tooltip, toasts)
  components/   Reusable UI (`ui/` primitives) and common app components
  contexts/     Simulated role/persona context
  data/         Fictional mock datasets (employees, org, payroll, …)
  features/     Feature-based pages and dialogs
    admin/ attendance/ dashboard/ employees/ expenses/ leave/
    organization/ payroll/ performance/ profile/ recruitment/
    reports/ settings/
  hooks/        Shared hooks (pagination, etc.)
  lib/          Constants, permissions, formatting utilities
  services/     Async mock API layer — the single place to swap in REST
  types/        Shared TypeScript entity and form interfaces
```

Each screen is composed from reusable building blocks: `DataTable`, `Pagination`, `PageHeader`,
`StatCard`, `StatusBadge`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `ExportButton`, form fields,
and the `ui/` primitives. Loading, empty and error states are handled per query, and destructive or
financial actions require confirmation and report via toasts.

### Replacing the mock services with a real API

Pages never touch mock arrays directly for writes/reads; they call functions exported from
`src/services/index.ts` (for example `fetchEmployees`, `createLeaveRequest`,
`processPayrollRun`). Each function is async and returns typed data. To use a backend:

1. Replace the body of each service function with a `fetch`/client call.
2. Keep the exported function names and typings in `src/types/index.ts`.
3. TanStack Query keys and invalidations continue to work unchanged.
4. Remove or reduce the artificial latency helper in the services.

---

## Responsiveness and UX

- Navy sidebar + white content on a light gray canvas, blue primary actions, Inter, rounded cards.
- Layouts collapse to stacked cards and horizontally scrollable tables on small screens; the sidebar
  becomes an overlay on mobile.
- Filters, pagination and CSV exports are consistent across list screens.
- Toasts confirm successful mutations; dialogs guard destructive and payroll actions.

---

## Known limitations

- Frontend demo only: no server, authentication, authorization, persistence or file storage.
- Role switching and permissions are simulated UI state, not security controls.
- All data resets on page reload; CSV "exports" and document downloads are generated client-side.
- Sidebar badge counts are static until a reload.
- Payroll, statutory and tax handling is illustrative and configurable in structure only; it is not
  a compliance implementation.
- Some demo lists are intentionally small or deterministic to keep the narrative coherent.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Run TypeScript project build and produce `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run Oxlint. |

The production build is verified with `tsc -b && vite build`.
