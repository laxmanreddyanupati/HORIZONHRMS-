import type { PayrollRun, Role, SystemUser } from '@/types'

/** Authenticated principal returned by /api/auth/login, /refresh and /me. */
export interface AuthUser extends Omit<SystemUser, 'role'> {
  role: Role
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  user: AuthUser
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  halfDay: number
  onLeave: number
  notMarked: number
  total: number
  rate: number
}

export interface EmployeeCounts {
  total: number
  active: number
  probation: number
  onLeave: number
  inactive: number
}

export interface LeaveSummary {
  totalRequests: number
  pending: number
  approved: number
  rejected: number
  onLeaveToday: number
}

export interface StatutoryConfig {
  label: string
  effectiveFrom: string
  description: string
  pfEmployeeRate: number
  esiEmployeeRate: number
  esiGrossThreshold: number
  professionalTaxMonthly: number
  illustrativeTdsRate: number
  tdsThresholdMonthly: number
}

export interface PayrollDashboard {
  currentRun: PayrollRun | null
  runs: PayrollRun[]
  activeCount: number
  statutoryConfig: StatutoryConfig | null
  ytdGross: number
  ytdNet: number
  pendingRuns: number
}

export interface DashboardOverview {
  snapshot: string
  stats: {
    totalEmployees: number
    activeEmployees: number
    presentToday: number
    onLeaveToday: number
    pendingLeaveRequests: number
    newHiresThisMonth: number
    attritionRate: number
    openPositions: number
    attendanceRate: number
    payrollMonthLabel: string
    monthlyPayroll: number
  }
  growth: Array<{ month: string; headcount: number }>
  departments: Array<{ name: string; value: number; color: string }>
  attendance: Array<{ day: string; date: string; present: number; absent: number; onLeave: number }>
  payroll: Array<{ month: string; gross: number; net: number; deductions: number }>
  currentRun: PayrollRun
  birthdays: Array<{ employee: import('@/types').Employee; date: string; daysAway: number; years?: number | null }>
  anniversaries: Array<{ employee: import('@/types').Employee; date: string; daysAway: number; years?: number | null }>
  activities: Array<import('@/types').AuditLog>
  upcomingHolidays: Array<import('@/types').Holiday>
  pendingExpenses: number
  openRoles: number
}
