import type { SystemUser } from '@/types'

export const systemUsers: SystemUser[] = [
  { id: 'USR-001', employeeId: 'HZT-0001', name: 'Vikram Rao', email: 'vikram.rao@horizontech.example', role: 'super-admin', status: 'Active', lastActive: '2026-10-30T09:10:00', mfaEnabled: true },
  { id: 'USR-002', employeeId: 'HZT-0002', name: 'Priya Menon', email: 'priya.menon@horizontech.example', role: 'hr-admin', status: 'Active', lastActive: '2026-10-30T09:51:00', mfaEnabled: true },
  { id: 'USR-003', employeeId: 'HZT-0006', name: 'Sneha Reddy', email: 'sneha.reddy@horizontech.example', role: 'hr-executive', status: 'Active', lastActive: '2026-10-29T18:04:00', mfaEnabled: true },
  { id: 'USR-004', employeeId: 'HZT-0003', name: 'Rohan Iyer', email: 'rohan.iyer@horizontech.example', role: 'manager', status: 'Active', lastActive: '2026-10-29T16:45:00', mfaEnabled: true },
  { id: 'USR-005', employeeId: 'HZT-0008', name: 'Meera Joshi', email: 'meera.joshi@horizontech.example', role: 'payroll-admin', status: 'Active', lastActive: '2026-10-30T08:20:00', mfaEnabled: true },
  { id: 'USR-006', employeeId: 'HZT-0005', name: 'Arjun Nair', email: 'arjun.nair@horizontech.example', role: 'employee', status: 'Active', lastActive: '2026-10-30T08:55:00', mfaEnabled: false },
  { id: 'USR-007', employeeId: 'HZT-0009', name: 'Aditya Verma', email: 'aditya.verma@horizontech.example', role: 'manager', status: 'Active', lastActive: '2026-10-29T19:22:00', mfaEnabled: true },
  { id: 'USR-008', employeeId: null, name: 'Kavita Rao', email: 'kavita.rao@horizontech.example', role: 'super-admin', status: 'Active', lastActive: '2026-10-29T15:12:00', mfaEnabled: true },
  { id: 'USR-009', employeeId: null, name: 'Dev Patel', email: 'dev.patel@horizontech.example', role: 'hr-executive', status: 'Invited', lastActive: '—', mfaEnabled: false },
  { id: 'USR-010', employeeId: null, name: 'Farah Khan', email: 'farah.khan@horizontech.example', role: 'payroll-admin', status: 'Suspended', lastActive: '2026-09-14T11:30:00', mfaEnabled: false },
]

export const roleMatrix = [
  { module: 'Employees', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Edit', manager: 'Team view', payrollAdmin: 'View', employee: 'Self' },
  { module: 'Organization', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Edit', manager: 'View', payrollAdmin: 'View', employee: 'View' },
  { module: 'Recruitment', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Full', manager: 'View', payrollAdmin: 'None', employee: 'None' },
  { module: 'Attendance', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Edit', manager: 'Team approvals', payrollAdmin: 'View', employee: 'Self' },
  { module: 'Leave', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Approve', manager: 'Team approvals', payrollAdmin: 'View', employee: 'Self' },
  { module: 'Payroll', superAdmin: 'Full', hrAdmin: 'View', hrExecutive: 'None', manager: 'None', payrollAdmin: 'Full', employee: 'Own payslips' },
  { module: 'Performance', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Edit', manager: 'Team reviews', payrollAdmin: 'None', employee: 'Self' },
  { module: 'Expenses', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'Approve', manager: 'Team approvals', payrollAdmin: 'Approve', employee: 'Self' },
  { module: 'Reports', superAdmin: 'Full', hrAdmin: 'Full', hrExecutive: 'View', manager: 'Team view', payrollAdmin: 'Payroll view', employee: 'None' },
  { module: 'Settings', superAdmin: 'Full', hrAdmin: 'People policies', hrExecutive: 'None', manager: 'None', payrollAdmin: 'Payroll settings', employee: 'None' },
  { module: 'User Management', superAdmin: 'Full', hrAdmin: 'Invite only', hrExecutive: 'None', manager: 'None', payrollAdmin: 'None', employee: 'None' },
  { module: 'Audit Logs', superAdmin: 'Full', hrAdmin: 'View', hrExecutive: 'None', manager: 'None', payrollAdmin: 'None', employee: 'None' },
]
