import type { AuditLog, Branch, Department, Designation, Holiday, Role, SystemUser } from '@/types'
import { auditLogs } from '@/data/audit'
import { systemUsers } from '@/data/users'
import { holidays } from '@/data/attendance'
import { leavePolicies } from '@/data/leaves'
import { branches, departments } from '@/data/organization'
import { designations } from '@/data/designations'
import { apiRequest } from '@/lib/api-client'

/**
 * The exported configuration objects below are hydrated in place from the API
 * so components that still import them read SQL Server values. All reads and
 * writes go through the API.
 */
export const companyProfile = {
  legalName: 'Horizon Technologies Private Limited',
  displayName: 'Horizon Technologies',
  domain: 'horizontech.example',
  industry: 'Information Technology',
  headquarters: 'Hyderabad, Telangana, India',
  email: 'people@horizontech.example',
  phone: '+91 40 6789 1200',
  website: 'www.horizontech.example',
  gstin: '36AABCH1234P1ZQ (demo)',
  pan: 'AABCH1234P (demo)',
  cin: 'U72200TG2016PTC104521 (demo)',
  currency: 'INR (₹)',
  timezone: 'Asia/Kolkata (IST)',
  financialYear: 'April – March',
  payrollFrequency: 'Monthly',
}

export const notificationPreferences = [
  { id: 'leave', label: 'Leave requests and approvals', email: true, inApp: true },
  { id: 'payroll', label: 'Payroll processing and payslips', email: true, inApp: true },
  { id: 'attendance', label: 'Attendance exceptions and corrections', email: false, inApp: true },
  { id: 'recruitment', label: 'Candidate pipeline and interviews', email: true, inApp: true },
  { id: 'performance', label: 'Performance review reminders', email: true, inApp: false },
  { id: 'announcements', label: 'Company announcements', email: true, inApp: true },
]

export const attendanceSettings = {
  workWeek: 'Monday to Friday',
  shiftStart: '09:00',
  shiftEnd: '18:00',
  graceMinutes: 15,
  halfDayHours: 4,
  fullDayHours: 8,
  autoMarkAbsent: true,
  requireLocation: false,
  allowCorrections: true,
  correctionWindowDays: 7,
}

export const payrollSettings = {
  payDay: 28,
  inputCutoffDay: 22,
  approvalRequired: true,
  payslipRelease: 'On payroll processing',
  bankFileFormat: 'Demo CSV',
  statutoryProfile: 'Demo statutory profile FY 2026–27',
  effectiveFrom: '2026-04-01',
  pfRate: 12,
  esiRate: 0.75,
  professionalTax: 200,
  tdsMethod: 'Illustrative flat-rate demo',
  disclaimer:
    'Payroll values in this demonstration are fictional. Statutory rates are illustrative and are not current legal rates. No salary is disbursed.',
}

export const rolesConfig = [
  { id: 'super-admin', name: 'Super Admin', description: 'Full platform access and configuration.', members: 2 },
  { id: 'hr-admin', name: 'HR Admin', description: 'People operations, policies and reporting.', members: 1 },
  { id: 'hr-executive', name: 'HR Executive', description: 'Employee records, recruitment and HR operations.', members: 2 },
  { id: 'manager', name: 'Manager', description: 'Team attendance, leave, performance and expenses.', members: 2 },
  { id: 'payroll-admin', name: 'Payroll Admin', description: 'Payroll processing and salary configuration.', members: 2 },
  { id: 'employee', name: 'Employee', description: 'Self-service attendance, leave and payslips.', members: 1 },
]

type NotificationPreference = (typeof notificationPreferences)[number]

function replaceArray<T>(target: T[], values: T[]): void {
  target.splice(0, target.length, ...values)
}

function upsertAuditLog(log: AuditLog): void {
  const index = auditLogs.findIndex((item) => item.id === log.id)
  if (index >= 0) auditLogs[index] = log
  else auditLogs.unshift(log)
}

export async function fetchCompanyProfile() {
  const profile = await apiRequest<typeof companyProfile>('/admin/company-profile')
  Object.assign(companyProfile, profile)
  return { ...companyProfile }
}

export async function updateCompanyProfile(input: Partial<typeof companyProfile>) {
  const profile = await apiRequest<typeof companyProfile>('/admin/company-profile', {
    method: 'PUT',
    body: { ...companyProfile, ...input },
  })
  Object.assign(companyProfile, profile)
  return { ...companyProfile }
}

export async function fetchNotificationPreferences() {
  const preferences = await apiRequest<NotificationPreference[]>('/admin/notification-preferences')
  replaceArray(notificationPreferences, preferences)
  return notificationPreferences.map((preference) => ({ ...preference }))
}

export async function updateNotificationPreference(
  id: string,
  input: Partial<Pick<NotificationPreference, 'email' | 'inApp'>>,
) {
  const current = notificationPreferences.find((item) => item.id === id)
  const preference = await apiRequest<NotificationPreference>(
    `/admin/notification-preferences/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: {
        email: input.email ?? current?.email ?? false,
        inApp: input.inApp ?? current?.inApp ?? false,
      },
    },
  )

  const index = notificationPreferences.findIndex((item) => item.id === id)
  if (index >= 0) notificationPreferences[index] = preference
  else notificationPreferences.push(preference)
  return { ...preference }
}

export async function fetchAttendanceSettings() {
  const settings = await apiRequest<typeof attendanceSettings>('/admin/attendance-settings')
  Object.assign(attendanceSettings, settings)
  return { ...attendanceSettings }
}

export async function updateAttendanceSettings(input: Partial<typeof attendanceSettings>) {
  const settings = await apiRequest<typeof attendanceSettings>('/admin/attendance-settings', {
    method: 'PUT',
    body: { ...attendanceSettings, ...input },
  })
  Object.assign(attendanceSettings, settings)
  return { ...attendanceSettings }
}

export async function fetchPayrollSettings() {
  const settings = await apiRequest<typeof payrollSettings>('/admin/payroll-settings')
  Object.assign(payrollSettings, settings)
  return { ...payrollSettings }
}

export async function updatePayrollSettings(input: Partial<typeof payrollSettings>) {
  const settings = await apiRequest<typeof payrollSettings>('/admin/payroll-settings', {
    method: 'PUT',
    body: { ...payrollSettings, ...input },
  })
  Object.assign(payrollSettings, settings)
  return { ...payrollSettings }
}

export async function fetchRolesConfig() {
  const roles = await apiRequest<typeof rolesConfig>('/admin/roles')
  replaceArray(rolesConfig, roles)
  return rolesConfig
}

export async function fetchAdminHolidays(): Promise<Holiday[]> {
  const list = await apiRequest<Holiday[]>('/admin/holidays')
  replaceArray(holidays, list)
  return list
}

export async function createHoliday(input: Omit<Holiday, 'id'>): Promise<Holiday> {
  const holiday = await apiRequest<Holiday>('/admin/holidays', {
    method: 'POST',
    body: input,
  })
  holidays.push(holiday)
  return holiday
}

export async function deleteHoliday(id: string): Promise<void> {
  await apiRequest<void>(`/admin/holidays/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const index = holidays.findIndex((holiday) => holiday.id === id)
  if (index >= 0) holidays.splice(index, 1)
}

export async function fetchAdminLeavePolicies() {
  const policies = await apiRequest<typeof leavePolicies>('/admin/leave-policies')
  replaceArray(leavePolicies, policies)
  return leavePolicies.map((policy) => ({ ...policy }))
}

export async function updateLeavePolicy(leaveTypeId: string, input: { maxConsecutiveDays: number; noticePeriodDays: number }) {
  const policy = await apiRequest<(typeof leavePolicies)[number]>(
    `/admin/leave-policies/${encodeURIComponent(leaveTypeId)}`,
    { method: 'PUT', body: input },
  )

  const index = leavePolicies.findIndex((item) => item.leaveTypeId === leaveTypeId)
  if (index >= 0) leavePolicies[index] = policy
  else leavePolicies.push(policy)
  return policy
}

export interface AuditFilters {
  module?: string
  search?: string
}

export async function fetchAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
  const logs = await apiRequest<AuditLog[]>('/admin/audit-logs', {
    query: { module: filters.module, search: filters.search },
  })
  logs.forEach(upsertAuditLog)
  return logs
}

export async function fetchSystemUsers(): Promise<SystemUser[]> {
  const users = await apiRequest<SystemUser[]>('/admin/users')
  replaceArray(systemUsers, users)
  return users
}

export async function inviteUser(input: { name: string; email: string; role: Role; employeeId?: string }): Promise<SystemUser> {
  const user = await apiRequest<SystemUser>('/admin/users/invite', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      role: input.role,
      employeeId: input.employeeId,
    },
  })
  systemUsers.push(user)
  return user
}

export async function updateSystemUser(
  id: string,
  input: Partial<Pick<SystemUser, 'role' | 'status'>>,
): Promise<SystemUser> {
  const user = await apiRequest<SystemUser>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { role: input.role, status: input.status },
  })

  const index = systemUsers.findIndex((item) => item.id === id)
  if (index >= 0) systemUsers[index] = user
  else systemUsers.push(user)
  return user
}

export async function updateSystemUserMfa(id: string, mfaEnabled: boolean): Promise<SystemUser> {
  const user = await apiRequest<SystemUser>(`/admin/users/${encodeURIComponent(id)}/mfa`, {
    method: 'PATCH',
    body: { mfaEnabled },
  })

  const index = systemUsers.findIndex((item) => item.id === id)
  if (index >= 0) systemUsers[index] = user
  else systemUsers.push(user)
  return user
}

export async function fetchBranches(): Promise<Branch[]> {
  const list = await apiRequest<Branch[]>('/admin/branches')
  replaceArray(branches, list)
  return list
}

export async function fetchDepartments(): Promise<Department[]> {
  const list = await apiRequest<Department[]>('/admin/departments')
  replaceArray(departments, list)
  return list
}

export async function fetchDesignations(): Promise<Designation[]> {
  const list = await apiRequest<Designation[]>('/admin/designations')
  replaceArray(designations, list)
  return list
}
