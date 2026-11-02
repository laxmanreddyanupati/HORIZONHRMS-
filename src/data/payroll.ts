import type { PayrollRun, Payslip, SalaryComponent, SalaryStructure } from '@/types'
import { employees } from './employees'
import { getDesignationById } from './designations'
import { mulberry32 } from '@/lib/utils'
import { format } from 'date-fns'

/**
 * Illustrative payroll configuration for the demo.
 *
 * These values are NOT current statutory rates and must not be treated as
 * legal or tax advice. In a production build this profile would be supplied
 * by an effective-dated statutory rules service, versioned by financial year
 * and state, with payroll calculations performed server-side.
 */
export const statutoryConfig = {
  label: 'Demo statutory profile',
  effectiveFrom: '2026-04-01',
  description: 'Illustrative percentages used only to populate demonstration payslips.',
  pfEmployeeRate: 0.12,
  esiEmployeeRate: 0.0075,
  esiGrossThreshold: 21000,
  professionalTaxMonthly: 200,
  illustrativeTdsRate: 0.1,
  tdsThresholdMonthly: 50000,
}

const levelBase: Record<string, number> = {
  L6: 6000000,
  L5: 3600000,
  L4: 2400000,
  L3: 1400000,
  L2: 750000,
}

const levelSpread: Record<string, number> = {
  L6: 2800000,
  L5: 1600000,
  L4: 800000,
  L3: 400000,
  L2: 200000,
}

function buildStructure(employeeId: string, annualCtc: number, effectiveFrom: string): SalaryStructure {
  const monthlyGross = Math.round(annualCtc / 12 / 100) * 100
  const basic = Math.round(monthlyGross * 0.4)
  const hra = Math.round(monthlyGross * 0.2)
  const conveyance = Math.round(monthlyGross * 0.05)
  const special = monthlyGross - basic - hra - conveyance
  const earnings: SalaryComponent[] = [
    { id: `${employeeId}-basic`, name: 'Basic Salary', type: 'earning', amount: basic },
    { id: `${employeeId}-hra`, name: 'House Rent Allowance', type: 'earning', amount: hra },
    { id: `${employeeId}-special`, name: 'Special Allowance', type: 'earning', amount: special },
    { id: `${employeeId}-conveyance`, name: 'Conveyance Allowance', type: 'earning', amount: conveyance },
  ]
  const pf = Math.round(basic * statutoryConfig.pfEmployeeRate)
  const esi = monthlyGross <= statutoryConfig.esiGrossThreshold ? Math.round(monthlyGross * statutoryConfig.esiEmployeeRate) : 0
  const tds = monthlyGross > statutoryConfig.tdsThresholdMonthly ? Math.round(monthlyGross * statutoryConfig.illustrativeTdsRate) : 0
  const deductions: SalaryComponent[] = [
    { id: `${employeeId}-pf`, name: 'Provident Fund (Employee)', type: 'deduction', amount: pf, statutory: true },
    { id: `${employeeId}-esi`, name: 'ESI (Employee)', type: 'deduction', amount: esi, statutory: true },
    { id: `${employeeId}-pt`, name: 'Professional Tax', type: 'deduction', amount: statutoryConfig.professionalTaxMonthly, statutory: true },
    { id: `${employeeId}-tds`, name: 'TDS (Illustrative)', type: 'deduction', amount: tds, statutory: true },
  ]
  return { employeeId, annualCtc, effectiveFrom, earnings, deductions }
}

export const salaryStructures: SalaryStructure[] = employees.map((employee, index) => {
  const designation = getDesignationById(employee.designationId)
  const level = designation?.level ?? 'L3'
  const rand = mulberry32(index * 191 + 41)()
  const annualCtc = Math.round((levelBase[level] + rand * levelSpread[level]) / 1000) * 1000
  const effectiveFrom = employee.dateOfJoining > '2026-04-01' ? employee.dateOfJoining : '2026-04-01'
  return buildStructure(employee.id, annualCtc, effectiveFrom)
})

export function getSalaryStructure(employeeId: string): SalaryStructure | undefined {
  return salaryStructures.find((structure) => structure.employeeId === employeeId)
}

export function monthlyGross(structure: SalaryStructure): number {
  return structure.earnings.reduce((sum, item) => sum + item.amount, 0)
}

const runPeriods: Array<{ month: number; year: number; status: PayrollRun['status']; processedOn?: string }> = [
  { month: 4, year: 2026, status: 'Paid', processedOn: '2026-04-30' },
  { month: 5, year: 2026, status: 'Paid', processedOn: '2026-05-29' },
  { month: 6, year: 2026, status: 'Paid', processedOn: '2026-06-30' },
  { month: 7, year: 2026, status: 'Paid', processedOn: '2026-07-31' },
  { month: 8, year: 2026, status: 'Paid', processedOn: '2026-08-31' },
  { month: 9, year: 2026, status: 'Paid', processedOn: '2026-09-30' },
  { month: 10, year: 2026, status: 'Draft' },
]

function makePayslip(employeeId: string, run: PayrollRun, index: number): Payslip {
  const structure = getSalaryStructure(employeeId)
  const earnings = structure?.earnings.map((item) => ({ ...item })) ?? []
  const deductions = structure?.deductions.map((item) => ({ ...item })) ?? []
  const gross = earnings.reduce((sum, item) => sum + item.amount, 0)
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0)
  return {
    id: `PAY-${run.id}-${employeeId}`,
    employeeId,
    payrollRunId: run.id,
    month: run.month,
    year: run.year,
    earnings,
    deductions,
    gross,
    totalDeductions,
    net: gross - totalDeductions,
    workingDays: 22,
    paidDays: 22 - (index % 7 === 0 ? 1 : 0),
    lop: index % 7 === 0 ? 1 : 0,
    status: run.status,
  }
}

const runs: PayrollRun[] = runPeriods.map((period) => {
  const label = format(new Date(period.year, period.month - 1, 1), 'MMMM yyyy')
  return {
    id: `PR-${period.year}-${String(period.month).padStart(2, '0')}`,
    month: period.month,
    year: period.year,
    periodLabel: label,
    status: period.status,
    employeeCount: employees.filter((e) => e.status !== 'Inactive').length,
    grossTotal: 0,
    deductionsTotal: 0,
    netTotal: 0,
    processedOn: period.processedOn,
  }
})

export const payrollRuns: PayrollRun[] = runs

export const payslips: Payslip[] = payrollRuns.flatMap((run) =>
  employees
    .filter((employee) => employee.status !== 'Inactive')
    .map((employee, index) => makePayslip(employee.id, run, index)),
)

payrollRuns.forEach((run) => {
  const slips = payslips.filter((slip) => slip.payrollRunId === run.id)
  run.grossTotal = slips.reduce((sum, slip) => sum + slip.gross, 0)
  run.deductionsTotal = slips.reduce((sum, slip) => sum + slip.totalDeductions, 0)
  run.netTotal = slips.reduce((sum, slip) => sum + slip.net, 0)
})

export function getPayrollRun(id: string): PayrollRun | undefined {
  return payrollRuns.find((run) => run.id === id)
}

export function getPayslipsForRun(runId: string): Payslip[] {
  return payslips.filter((slip) => slip.payrollRunId === runId)
}

export function getPayslipsForEmployee(employeeId: string): Payslip[] {
  return payslips.filter((slip) => slip.employeeId === employeeId)
}

export function getPayslip(employeeId: string, runId: string): Payslip | undefined {
  return payslips.find((slip) => slip.employeeId === employeeId && slip.payrollRunId === runId)
}

export const currentPayrollRun = payrollRuns[payrollRuns.length - 1]
