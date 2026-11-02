import { createHashRouter, RouterProvider } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { RequireAccess } from '@/components/auth/require-access'
import { RequireAuth } from '@/components/auth/require-auth'
import type { ModuleKey } from '@/lib/constants'
import { LoginPage } from '@/features/auth/login-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { EmployeeListPage } from '@/features/employees/employee-list-page'
import { EmployeeFormPage } from '@/features/employees/employee-form-page'
import { EmployeeProfilePage } from '@/features/employees/employee-profile-page'
import { OrganizationPage } from '@/features/organization/organization-page'
import { AttendancePage } from '@/features/attendance/attendance-page'
import { LeavePage } from '@/features/leave/leave-page'
import { PayrollPage } from '@/features/payroll/payroll-page'
import { PayslipPage } from '@/features/payroll/payslip-page'
import { RecruitmentPage } from '@/features/recruitment/recruitment-page'
import { PerformancePage } from '@/features/performance/performance-page'
import { ExpensesPage } from '@/features/expenses/expenses-page'
import { ReportsPage } from '@/features/reports/reports-page'
import { SettingsPage } from '@/features/settings/settings-page'
import { UsersPage } from '@/features/admin/users-page'
import { AuditLogsPage } from '@/features/admin/audit-logs-page'
import { ProfilePage } from '@/features/profile/profile-page'
import { NotFoundPage } from '@/features/not-found-page'

function guarded(moduleKey: ModuleKey, element: ReactElement) {
  return <RequireAccess moduleKey={moduleKey}>{element}</RequireAccess>
}

const router = createHashRouter([
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: guarded('dashboard', <DashboardPage />) },
      {
        path: 'employees',
        element: guarded('employees', <EmployeeListPage />),
      },
      {
        path: 'employees/new',
        element: guarded('employees', <EmployeeFormPage />),
      },
      {
        path: 'employees/:employeeId',
        element: guarded('employees', <EmployeeProfilePage />),
      },
      {
        path: 'employees/:employeeId/edit',
        element: guarded('employees', <EmployeeFormPage />),
      },
      { path: 'organization', element: guarded('organization', <OrganizationPage />) },
      { path: 'attendance', element: guarded('attendance', <AttendancePage />) },
      { path: 'leave', element: guarded('leave', <LeavePage />) },
      { path: 'payroll', element: guarded('payroll', <PayrollPage />) },
      {
        path: 'payroll/:runId/payslip/:employeeId',
        element: guarded('payroll', <PayslipPage />),
      },
      { path: 'recruitment', element: guarded('recruitment', <RecruitmentPage />) },
      { path: 'performance', element: guarded('performance', <PerformancePage />) },
      { path: 'expenses', element: guarded('expenses', <ExpensesPage />) },
      { path: 'reports', element: guarded('reports', <ReportsPage />) },
      { path: 'settings', element: guarded('settings', <SettingsPage />) },
      { path: 'users', element: guarded('users', <UsersPage />) },
      { path: 'audit-logs', element: guarded('audit', <AuditLogsPage />) },
      { path: 'profile', element: guarded('profile', <ProfilePage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
