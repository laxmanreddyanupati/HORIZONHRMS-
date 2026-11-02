import type { DashboardStats, Employee } from '@/types'
import { employees } from './employees'
import { departments } from './organization'
import { getAttendanceSummary, getAttendanceTrend } from './attendance'
import { leaveRequests } from './leaves'
import { currentPayrollRun, payrollRuns } from './payroll'
import { jobOpenings } from './recruitment'
import { expenseClaims } from './expenses'
import { auditLogs } from './audit'
import { CHART_COLORS } from '@/lib/constants'
import { DEMO_SNAPSHOT_DATE } from '@/lib/utils'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'

const snapshot = format(DEMO_SNAPSHOT_DATE, 'yyyy-MM-dd')
const attendance = getAttendanceSummary(snapshot)

export const dashboardStats: DashboardStats = {
  totalEmployees: employees.length,
  activeEmployees: employees.filter((employee) => employee.status !== 'Inactive').length,
  presentToday: attendance.present + attendance.late,
  onLeaveToday: attendance.onLeave,
  pendingLeaveRequests: leaveRequests.filter((request) => request.status === 'Pending').length,
  newHiresThisMonth: employees.filter((employee) => employee.dateOfJoining.startsWith('2026-10')).length,
  attritionRate: 3.1,
  openPositions: jobOpenings.filter((job) => job.status === 'Open').reduce((sum, job) => sum + job.openings, 0),
  attendanceRate: attendance.rate,
  payrollMonthLabel: currentPayrollRun.periodLabel,
  monthlyPayroll: currentPayrollRun.netTotal,
}

export function getDepartmentDistribution() {
  return departments
    .map((department, index) => ({
      name: department.name,
      value: employees.filter((employee) => employee.departmentId === department.id).length,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

export function getEmployeeGrowth(): Array<{ month: string; headcount: number }> {
  const result: Array<{ month: string; headcount: number }> = []
  for (let i = 11; i >= 0; i -= 1) {
    const monthDate = new Date(DEMO_SNAPSHOT_DATE.getFullYear(), DEMO_SNAPSHOT_DATE.getMonth() - i, 1)
    const cutoff = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const headcount = employees.filter((employee) => {
      const joining = parseISO(employee.dateOfJoining)
      return joining <= cutoff && employee.status !== 'Inactive'
    }).length
    result.push({ month: format(monthDate, 'MMM'), headcount })
  }
  return result
}

export function getAttendanceOverview() {
  return getAttendanceTrend(7).map((point) => ({
    day: format(parseISO(point.date), 'EEE'),
    date: point.date,
    present: point.present,
    absent: point.absent,
    onLeave: point.onLeave,
  }))
}

export function getPayrollTrend() {
  return payrollRuns.map((run) => ({
    month: format(new Date(run.year, run.month - 1, 1), 'MMM'),
    gross: Math.round(run.grossTotal / 100000),
    net: Math.round(run.netTotal / 100000),
    deductions: Math.round(run.deductionsTotal / 100000),
  }))
}

interface UpcomingEvent {
  employee: Employee
  date: string
  daysAway: number
  years?: number
}

function nextOccurrence(dateString: string, from: Date): Date {
  const original = parseISO(dateString)
  let next = new Date(from.getFullYear(), original.getMonth(), original.getDate())
  if (next < from) {
    next = new Date(from.getFullYear() + 1, original.getMonth(), original.getDate())
  }
  return next
}

export function getUpcomingBirthdays(limit = 5): UpcomingEvent[] {
  const from = new Date(DEMO_SNAPSHOT_DATE)
  return employees
    .map((employee) => {
      const next = nextOccurrence(employee.dateOfBirth, from)
      return { employee, date: format(next, 'yyyy-MM-dd'), daysAway: differenceInCalendarDays(next, from) }
    })
    .filter((item) => item.daysAway <= 45)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit)
}

export function getUpcomingAnniversaries(limit = 5): UpcomingEvent[] {
  const from = new Date(DEMO_SNAPSHOT_DATE)
  return employees
    .filter((employee) => employee.status !== 'Inactive')
    .map((employee) => {
      const next = nextOccurrence(employee.dateOfJoining, from)
      const joinYear = parseISO(employee.dateOfJoining).getFullYear()
      const years = next.getFullYear() - joinYear
      return {
        employee,
        date: format(next, 'yyyy-MM-dd'),
        daysAway: differenceInCalendarDays(next, from),
        years,
      }
    })
    .filter((item) => item.daysAway <= 60 && (item.years ?? 0) >= 1)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit)
}

export function getRecentActivities() {
  return auditLogs.slice(0, 6)
}

export function getPendingExpenseCount(): number {
  return expenseClaims.filter((claim) => claim.status === 'Pending').length
}

export function getOpenRolesCount(): number {
  return jobOpenings.filter((job) => job.status === 'Open').length
}

export const dashboardSnapshotDate = snapshot
