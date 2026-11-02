import type { PayrollRun, Payslip, SalaryStructure } from '@/types'
import type { PayrollDashboard } from '@/lib/api-types'
import {
  payrollRuns,
  payslips,
  salaryStructures,
  statutoryConfig,
} from '@/data/payroll'
import { apiDownload, apiRequest, saveBlob } from '@/lib/api-client'
import { getCurrentUser } from '@/lib/auth-storage'
import { format } from 'date-fns'

function upsertRun(run: PayrollRun): PayrollRun {
  const index = payrollRuns.findIndex((item) => item.id === run.id)
  if (index >= 0) payrollRuns[index] = run
  else payrollRuns.push(run)
  return run
}

function upsertPayslip(payslip: Payslip): Payslip {
  const index = payslips.findIndex((item) => item.id === payslip.id)
  if (index >= 0) payslips[index] = payslip
  else payslips.push(payslip)
  return payslip
}

function replacePayslipsForRun(runId: string, values: Payslip[]): void {
  for (let index = payslips.length - 1; index >= 0; index -= 1) {
    if (payslips[index].payrollRunId === runId) payslips.splice(index, 1)
  }
  payslips.push(...values)
}

function replacePayslipsForEmployee(employeeId: string, values: Payslip[]): void {
  for (let index = payslips.length - 1; index >= 0; index -= 1) {
    if (payslips[index].employeeId === employeeId) payslips.splice(index, 1)
  }
  payslips.push(...values)
}

function upsertStructure(structure: SalaryStructure): SalaryStructure {
  const index = salaryStructures.findIndex((item) => item.employeeId === structure.employeeId)
  if (index >= 0) salaryStructures[index] = structure
  else salaryStructures.push(structure)
  return structure
}

export async function fetchPayrollRuns(): Promise<PayrollRun[]> {
  const runs = await apiRequest<PayrollRun[]>('/payroll/runs')
  payrollRuns.splice(0, payrollRuns.length, ...runs)
  return runs
}

export async function fetchPayrollRun(runId: string): Promise<PayrollRun> {
  const user = getCurrentUser()

  // Employees cannot read company-wide run metadata, so derive their run header
  // from their own payslip for the requested period.
  if (user?.role === 'employee' && user.employeeId) {
    const slip = await apiRequest<Payslip>(
      `/payroll/runs/${encodeURIComponent(runId)}/payslips/${encodeURIComponent(user.employeeId)}`,
    )
    upsertPayslip(slip)
    return {
      id: slip.payrollRunId || runId,
      month: slip.month,
      year: slip.year,
      periodLabel: format(new Date(slip.year, slip.month - 1, 1), 'MMMM yyyy'),
      status: slip.status,
      employeeCount: 1,
      grossTotal: slip.gross,
      deductionsTotal: slip.totalDeductions,
      netTotal: slip.net,
    }
  }

  return upsertRun(await apiRequest<PayrollRun>(`/payroll/runs/${encodeURIComponent(runId)}`))
}

export async function fetchPayslips(runId: string): Promise<Payslip[]> {
  const slips = await apiRequest<Payslip[]>(`/payroll/runs/${encodeURIComponent(runId)}/payslips`)
  replacePayslipsForRun(runId, slips)
  return slips
}

export async function fetchPayslip(employeeId: string, runId: string): Promise<Payslip> {
  const payslip = await apiRequest<Payslip>(
    `/payroll/runs/${encodeURIComponent(runId)}/payslips/${encodeURIComponent(employeeId)}`,
  )
  return upsertPayslip(payslip)
}

export async function fetchEmployeePayslips(employeeId: string): Promise<Payslip[]> {
  const slips = await apiRequest<Payslip[]>(
    `/payroll/employees/${encodeURIComponent(employeeId)}/payslips`,
  )
  replacePayslipsForEmployee(employeeId, slips)
  return slips
}

export async function fetchSalaryStructures(): Promise<SalaryStructure[]> {
  const user = getCurrentUser()

  if (user?.role === 'employee') {
    if (!user.employeeId) return []
    const structure = await apiRequest<SalaryStructure>(
      `/payroll/salary-structures/${encodeURIComponent(user.employeeId)}`,
    )
    upsertStructure(structure)
    return [structure]
  }

  const structures = await apiRequest<SalaryStructure[]>('/payroll/salary-structures')
  salaryStructures.splice(0, salaryStructures.length, ...structures)
  return structures
}

export async function fetchSalaryStructure(employeeId: string): Promise<SalaryStructure> {
  const structure = await apiRequest<SalaryStructure>(
    `/payroll/salary-structures/${encodeURIComponent(employeeId)}`,
  )
  return upsertStructure(structure)
}

export async function processPayrollRun(runId: string): Promise<PayrollRun> {
  const run = await apiRequest<PayrollRun>(
    `/payroll/runs/${encodeURIComponent(runId)}/process`,
    { method: 'POST' },
  )
  upsertRun(run)
  payslips
    .filter((slip) => slip.payrollRunId === run.id)
    .forEach((slip) => {
      slip.status = 'Processed'
    })
  return run
}

export async function markPayrollPaid(runId: string): Promise<PayrollRun> {
  const run = await apiRequest<PayrollRun>(
    `/payroll/runs/${encodeURIComponent(runId)}/pay`,
    { method: 'POST' },
  )
  upsertRun(run)
  payslips
    .filter((slip) => slip.payrollRunId === run.id)
    .forEach((slip) => {
      slip.status = 'Paid'
    })
  return run
}

export async function fetchPayrollDashboard(): Promise<PayrollDashboard> {
  const dashboard = await apiRequest<PayrollDashboard>('/payroll/dashboard')

  payrollRuns.splice(0, payrollRuns.length, ...dashboard.runs)
  if (dashboard.statutoryConfig) {
    Object.assign(statutoryConfig, dashboard.statutoryConfig)
  }

  return dashboard
}

export async function downloadPayslipDemo(employeeId: string, runId: string): Promise<void> {
  const file = await apiDownload(
    `/payroll/payslips/${encodeURIComponent(employeeId)}/${encodeURIComponent(runId)}/download`,
    `Horizon-Payslip-${employeeId}-${runId}.txt`,
  )
  saveBlob(file.blob, file.filename)
}
