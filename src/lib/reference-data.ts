import { apiRequest } from './api-client'
import type {
  AuditLog,
  Branch,
  Candidate,
  Department,
  Designation,
  Employee,
  ExpenseCategory,
  ExpenseClaim,
  Holiday,
  Interview,
  JobOpening,
  LeavePolicy,
  LeaveRequest,
  LeaveType,
  SystemUser,
} from '@/types'
import { employees } from '@/data/employees'
import { branches, departments } from '@/data/organization'
import { designations } from '@/data/designations'
import { holidays } from '@/data/attendance'
import { leavePolicies, leaveRequests, leaveTypes } from '@/data/leaves'
import { candidates, interviews, jobOpenings } from '@/data/recruitment'
import { expenseCategories, expenseClaims } from '@/data/expenses'
import { auditLogs } from '@/data/audit'
import { systemUsers } from '@/data/users'

/**
 * The screens still use the seeded `@/data` arrays for synchronous label
 * lookups (employee names, department titles, badge counts). Those arrays are
 * filled from the API so the UI reflects SQL Server rather than the bundled
 * mock fixtures. Individual pages and services always call the API for the
 * authoritative records.
 */
function replaceArray<T>(target: T[], values: T[]): void {
  target.splice(0, target.length, ...values)
}

async function fill<T>(target: T[], load: () => Promise<T[]>, label: string): Promise<void> {
  try {
    const values = await load()
    replaceArray(target, values)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[reference-data] Could not hydrate ${label}.`, error)
    }
  }
}

async function loadAllEmployees(): Promise<Employee[]> {
  const pageSize = 200
  const first = await apiRequest<{
    data: Employee[]
    totalPages: number
  }>('/employees', { query: { page: 1, pageSize, sortBy: 'name', sortDir: 'asc' } })

  const all = [...first.data]
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await apiRequest<{ data: Employee[] }>('/employees', {
      query: { page, pageSize, sortBy: 'name', sortDir: 'asc' },
    })
    all.push(...next.data)
  }
  return all
}

let inFlight: Promise<void> | null = null
let hydrated = false

export function hydrateReferenceData(force = false): Promise<void> {
  if (hydrated && !force) return Promise.resolve()
  if (inFlight) return inFlight

  inFlight = Promise.allSettled([
    fill(employees, loadAllEmployees, 'employees'),
    fill(departments, () => apiRequest<Department[]>('/organization/departments'), 'departments'),
    fill(designations, () => apiRequest<Designation[]>('/organization/designations'), 'designations'),
    fill(branches, () => apiRequest<Branch[]>('/organization/branches'), 'branches'),
    fill(leaveTypes, () => apiRequest<LeaveType[]>('/leave/types'), 'leave types'),
    fill(leavePolicies, () => apiRequest<LeavePolicy[]>('/leave/policies'), 'leave policies'),
    fill(leaveRequests, () => apiRequest<LeaveRequest[]>('/leave/requests'), 'leave requests'),
    fill(holidays, () => apiRequest<Holiday[]>('/attendance/holidays'), 'holidays'),
    fill(jobOpenings, () => apiRequest<JobOpening[]>('/recruitment/jobs'), 'job openings'),
    fill(candidates, () => apiRequest<Candidate[]>('/recruitment/candidates'), 'candidates'),
    fill(interviews, () => apiRequest<Interview[]>('/recruitment/interviews'), 'interviews'),
    fill(expenseCategories, () => apiRequest<ExpenseCategory[]>('/expenses/categories'), 'expense categories'),
    fill(expenseClaims, () => apiRequest<ExpenseClaim[]>('/expenses'), 'expense claims'),
    fill(auditLogs, () => apiRequest<AuditLog[]>('/admin/audit-logs'), 'audit logs'),
    fill(systemUsers, () => apiRequest<SystemUser[]>('/admin/users'), 'system users'),
  ])
    .then(() => {
      hydrated = true
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
