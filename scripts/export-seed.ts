/**
 * One-off seed exporter.
 *
 * Bundles the frontend's deterministic demo data modules and writes them to
 * backend/HorizonHRMS.Api/Data/Seed/*.json so the API can seed SQL Server with
 * exactly the same records the UI previously held in memory.
 *
 * Run with: npx vite build --ssr scripts/export-seed.ts --outDir scripts/.seed-out --emptyOutDir
 *           node scripts/.seed-out/export-seed.js
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { employees, DEMO_MANAGER_EMPLOYEE_ID, DEMO_SELF_SERVICE_EMPLOYEE_ID } from '@/data/employees'
import { branches, departments } from '@/data/organization'
import { designations } from '@/data/designations'
import { attendanceCorrections, attendanceRecords, holidays, shifts } from '@/data/attendance'
import { leaveBalances, leavePolicies, leaveRequests, leaveTypes } from '@/data/leaves'
import {
  payrollRuns,
  payslips,
  salaryStructures,
  statutoryConfig,
} from '@/data/payroll'
import { candidates, interviews, jobOpenings } from '@/data/recruitment'
import { appraisalCycles, currentCycle, feedback, goals, reviews } from '@/data/performance'
import { expenseCategories, expenseClaims } from '@/data/expenses'
import { auditLogs } from '@/data/audit'
import { roleMatrix, systemUsers } from '@/data/users'
import { notifications } from '@/data/notifications'
import {
  attendanceSettings,
  companyProfile,
  notificationPreferences,
  payrollSettings,
  rolesConfig,
} from '@/services/admin-service'
import { DEMO_SNAPSHOT_DATE, isoDate } from '@/lib/utils'

const outDir = resolve(process.cwd(), 'backend/HorizonHRMS.Api/Data/Seed')
mkdirSync(outDir, { recursive: true })

function write(name: string, value: unknown) {
  writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(value, null, 2), 'utf8')
  // eslint-disable-next-line no-console
  console.log(`wrote ${name}.json`)
}

write('meta', {
  snapshotDate: isoDate(DEMO_SNAPSHOT_DATE),
  demoManagerEmployeeId: DEMO_MANAGER_EMPLOYEE_ID,
  demoSelfServiceEmployeeId: DEMO_SELF_SERVICE_EMPLOYEE_ID,
  currentCycleId: currentCycle.id,
})

write('employees', employees)
write('departments', departments)
write('designations', designations)
write('branches', branches)
write('shifts', shifts)
write('holidays', holidays)
write('attendance-records', attendanceRecords)
write('attendance-corrections', attendanceCorrections)
write('leave-types', leaveTypes)
write('leave-policies', leavePolicies)
write('leave-balances', leaveBalances)
write('leave-requests', leaveRequests)
write('payroll-runs', payrollRuns)
write('payslips', payslips)
write('salary-structures', salaryStructures)
write('statutory-config', statutoryConfig)
write('job-openings', jobOpenings)
write('candidates', candidates)
write('interviews', interviews)
write('appraisal-cycles', appraisalCycles)
write('goals', goals)
write('reviews', reviews)
write('feedback', feedback)
write('expense-categories', expenseCategories)
write('expense-claims', expenseClaims)
write('audit-logs', auditLogs)
write('system-users', systemUsers)
write('notifications', notifications)
write('company-profile', companyProfile)
write('notification-preferences', notificationPreferences)
write('attendance-settings', attendanceSettings)
write('payroll-settings', payrollSettings)
write('roles-config', rolesConfig)
write('role-matrix', roleMatrix)

console.log('Seed export complete.')
