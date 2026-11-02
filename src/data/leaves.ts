import type { LeaveBalance, LeavePolicy, LeaveRequest, LeaveType } from '@/types'
import { employees } from './employees'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export const leaveTypes: LeaveType[] = [
  {
    id: 'lt-casual',
    name: 'Casual Leave',
    code: 'CL',
    color: '#2563eb',
    annualQuota: 12,
    carryForward: false,
    requiresDocument: false,
    description: 'Short planned absences for personal matters. Applied at least two days in advance.',
  },
  {
    id: 'lt-sick',
    name: 'Sick Leave',
    code: 'SL',
    color: '#f59e0b',
    annualQuota: 10,
    carryForward: true,
    requiresDocument: true,
    description: 'Absence due to illness. A medical certificate is required for three or more consecutive days.',
  },
  {
    id: 'lt-earned',
    name: 'Earned Leave',
    code: 'EL',
    color: '#14b8a6',
    annualQuota: 18,
    carryForward: true,
    requiresDocument: false,
    description: 'Planned annual leave accrued monthly. Up to 10 days may be carried forward.',
  },
  {
    id: 'lt-unpaid',
    name: 'Leave Without Pay',
    code: 'LWP',
    color: '#64748b',
    annualQuota: 0,
    carryForward: false,
    requiresDocument: false,
    description: 'Unpaid leave used when paid balances are exhausted. Requires manager and HR approval.',
  },
  {
    id: 'lt-paternity',
    name: 'Paternity Leave',
    code: 'PL',
    color: '#8b5cf6',
    annualQuota: 10,
    carryForward: false,
    requiresDocument: true,
    description: 'Paid leave for employees on the birth or adoption of a child, taken within six months.',
  },
  {
    id: 'lt-comp',
    name: 'Compensatory Off',
    code: 'CO',
    color: '#0ea5e9',
    annualQuota: 5,
    carryForward: false,
    requiresDocument: false,
    description: 'Time off earned for approved weekend or public holiday work. Expires in 90 days.',
  },
]

export const leavePolicies: LeavePolicy[] = [
  { leaveTypeId: 'lt-casual', accrual: 'Credited annually (January)', maxConsecutiveDays: 4, noticePeriodDays: 2, allowHalfDay: true, policy: 'Casual leave is intended for short personal errands. Requests above four consecutive days require HR approval.' },
  { leaveTypeId: 'lt-sick', accrual: 'Credited annually (January)', maxConsecutiveDays: 10, noticePeriodDays: 0, allowHalfDay: true, policy: 'Inform your manager on the first day of absence. Medical documentation is required beyond three consecutive days.' },
  { leaveTypeId: 'lt-earned', accrual: '1.5 days per completed month', maxConsecutiveDays: 15, noticePeriodDays: 14, allowHalfDay: true, policy: 'Earned leave should be planned with your manager at least two weeks in advance. Carry forward up to 10 days.' },
  { leaveTypeId: 'lt-unpaid', accrual: 'Not accrued', maxConsecutiveDays: 10, noticePeriodDays: 7, allowHalfDay: false, policy: 'Leave without pay may be approved after paid balances are exhausted. Salary is pro-rated for unpaid days.' },
  { leaveTypeId: 'lt-paternity', accrual: 'Credited on event', maxConsecutiveDays: 10, noticePeriodDays: 7, allowHalfDay: false, policy: 'Supporting documentation is required. Leave must be completed within six months of the event.' },
  { leaveTypeId: 'lt-comp', accrual: 'Earned per approved holiday work', maxConsecutiveDays: 2, noticePeriodDays: 2, allowHalfDay: true, policy: 'Compensatory off must be used within 90 days of being credited and cannot be encashed.' },
]

const leaveStatusCycle: LeaveRequest['status'][] = [
  'Approved', 'Approved', 'Pending', 'Approved', 'Rejected', 'Approved', 'Pending',
  'Approved', 'Approved', 'Rejected', 'Approved', 'Pending', 'Approved', 'Approved',
]

const leaveReasons = [
  'Family function at native place.',
  'Medical consultation and recovery.',
  'Planned vacation with family.',
  'Personal errand and home maintenance.',
  'Attending a family wedding.',
  'Fever and throat infection — doctor advised rest.',
  'Childcare and school admission.',
  'Extended weekend trip.',
  'Relocation to a new apartment.',
  'Annual family holiday.',
  'Minor dental procedure.',
  'Parent’s health check-up.',
]

function makeRequest(index: number, employeeId: string, startOffset: number, length: number, forcedStatus?: LeaveRequest['status']): LeaveRequest {
  const start = addDays(new Date(2026, 8, 7), startOffset)
  const end = addDays(start, length - 1)
  const type = leaveTypes[index % leaveTypes.length]
  const status = forcedStatus ?? leaveStatusCycle[index % leaveStatusCycle.length]
  const applied = addDays(start, -Math.max(3, 5 + (index % 8)))
  return {
    id: `LV-${String(1001 + index)}`,
    employeeId,
    leaveTypeId: type.id,
    fromDate: format(start, 'yyyy-MM-dd'),
    toDate: format(end, 'yyyy-MM-dd'),
    days: differenceInCalendarDays(end, start) + 1,
    reason: leaveReasons[index % leaveReasons.length],
    appliedOn: format(applied, 'yyyy-MM-dd'),
    status,
    approverId: status === 'Pending' ? undefined : status === 'Rejected' ? 'HZT-0002' : 'HZT-0003',
    decidedOn: status === 'Pending' ? undefined : format(addDays(applied, 1), 'yyyy-MM-dd'),
    note: status === 'Rejected' ? 'Team coverage unavailable during the requested period.' : undefined,
  }
}

const currentLeaveEmployeeIndexes = [24, 55, 83, 101, 118]

const requests: LeaveRequest[] = [
  ...currentLeaveEmployeeIndexes.map((empIndex, i) =>
    makeRequest(
      i,
      employees[empIndex].id,
      -3 + i,
      3 + (i % 3),
      'Approved',
    ),
  ),
  ...Array.from({ length: 30 }, (_, i) => {
    const employee = employees[(i * 7 + 12) % employees.length]
    return makeRequest(i + 10, employee.id, 2 + i * 2, 1 + (i % 4))
  }),
  ...Array.from({ length: 8 }, (_, i) => {
    const employee = employees[(i * 11 + 31) % employees.length]
    return makeRequest(i + 45, employee.id, 42 + i * 2, 1 + (i % 3), 'Pending')
  }),
]

export const leaveRequests: LeaveRequest[] = requests

export function computeLeaveBalances(): LeaveBalance[] {
  const balances: LeaveBalance[] = []
  employees.forEach((employee, index) => {
    leaveTypes.forEach((type, typeIndex) => {
      if (type.id === 'lt-unpaid') {
        balances.push({ employeeId: employee.id, leaveTypeId: type.id, allocated: 0, used: 0, pending: 0 })
        return
      }
      const baseAllocated = type.id === 'lt-paternity' ? (employee.gender === 'Male' ? 10 : 0) : type.annualQuota
      const used = typeIndex === 0 ? (index * 3) % 7 : typeIndex === 1 ? (index * 2) % 5 : (index * 5) % 11
      balances.push({
        employeeId: employee.id,
        leaveTypeId: type.id,
        allocated: baseAllocated,
        used: Math.min(used, baseAllocated),
        pending: 0,
      })
    })
  })

  leaveRequests.forEach((request) => {
    const balance = balances.find(
      (b) => b.employeeId === request.employeeId && b.leaveTypeId === request.leaveTypeId,
    )
    if (!balance) return
    if (request.status === 'Approved') balance.used = Math.min(balance.allocated, balance.used + request.days)
    if (request.status === 'Pending') balance.pending += request.days
  })

  return balances
}

export const leaveBalances: LeaveBalance[] = computeLeaveBalances()

export function getLeaveTypeById(id: string): LeaveType | undefined {
  return leaveTypes.find((type) => type.id === id)
}

export function getLeaveTypeName(id: string): string {
  return getLeaveTypeById(id)?.name ?? '—'
}

export function getLeaveBalance(employeeId: string): LeaveBalance[] {
  return leaveBalances.filter((balance) => balance.employeeId === employeeId)
}

export function isEmployeeOnLeave(employeeId: string, date: string): boolean {
  const target = parseISO(date)
  return leaveRequests.some(
    (request) =>
      request.employeeId === employeeId &&
      request.status === 'Approved' &&
      parseISO(request.fromDate) <= target &&
      parseISO(request.toDate) >= target,
  )
}
