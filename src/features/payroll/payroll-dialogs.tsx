import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, PlayCircle } from 'lucide-react'
import { AvatarName } from '@/components/common/avatar-name'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { ErrorState } from '@/components/common/error-state'
import { Pagination } from '@/components/common/pagination'
import { SensitiveValue } from '@/components/common/sensitive-value'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getEmployeeById, getEmployeeName } from '@/data/employees'
import { usePagination } from '@/hooks/use-pagination'
import { fetchPayrollRun, fetchPayslips } from '@/services'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PayrollRun, Payslip, SalaryStructure } from '@/types'

interface PayrollRunDialogProps {
  open: boolean
  runId: string | null
  onOpenChange: (open: boolean) => void
  canManagePayroll: boolean
  onProcess: (run: PayrollRun) => void
  onPay: (run: PayrollRun) => void
}

function PayslipTable({ payslips }: { payslips: Payslip[] }) {
  const pagination = usePagination(payslips, 10)

  const columns: Array<DataTableColumn<Payslip>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (slip) => {
        const employee = getEmployeeById(slip.employeeId)
        if (!employee) {
          return (
            <div>
              <p className="font-medium text-slate-700">{slip.employeeId}</p>
              <p className="text-[11px] text-slate-400">Employee record unavailable</p>
            </div>
          )
        }
        return (
          <AvatarName
            firstName={employee.firstName}
            lastName={employee.lastName}
            subtitle={employee.id}
            size="sm"
          />
        )
      },
    },
    {
      key: 'days',
      header: 'Paid days',
      cell: (slip) => (
        <div>
          <p className="tabular-nums text-slate-700">
            {slip.paidDays} / {slip.workingDays}
          </p>
          <p className="text-[11px] text-slate-400">LOP {slip.lop}</p>
        </div>
      ),
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      cell: (slip) => <span className="tabular-nums">{formatCurrency(slip.gross)}</span>,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      cell: (slip) => <span className="tabular-nums">{formatCurrency(slip.totalDeductions)}</span>,
    },
    {
      key: 'net',
      header: 'Net pay',
      align: 'right',
      cell: (slip) => (
        <span className="font-medium tabular-nums text-slate-800">{formatCurrency(slip.net)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (slip) => <StatusBadge status={slip.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (slip) => (
        <Button variant="ghost" size="sm" asChild>
          <Link
            to={`/payroll/${slip.payrollRunId}/payslip/${slip.employeeId}`}
            aria-label={`View payslip for ${getEmployeeName(slip.employeeId)}`}
          >
            <ExternalLink />
            View
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={pagination.pageItems}
      rowKey={(slip) => slip.id}
      skeletonRows={5}
      emptyTitle="No payslips in this run"
      emptyDescription="Payslips appear once the payroll run has been generated."
      footer={
        payslips.length > 10 ? (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="payslips"
          />
        ) : null
      }
    />
  )
}

export function PayrollRunDialog({
  open,
  runId,
  onOpenChange,
  canManagePayroll,
  onProcess,
  onPay,
}: PayrollRunDialogProps) {
  const runQuery = useQuery({
    queryKey: ['payroll-runs', runId],
    queryFn: () => fetchPayrollRun(runId as string),
    enabled: open && Boolean(runId),
  })

  const payslipsQuery = useQuery({
    queryKey: ['payslips', 'run', runId],
    queryFn: () => fetchPayslips(runId as string),
    enabled: open && Boolean(runId),
  })

  const run = runQuery.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{run ? `${run.periodLabel} payroll run` : 'Payroll run'}</DialogTitle>
          <DialogDescription>
            Run summary and payslips. Values are illustrative and no salary is disbursed.
          </DialogDescription>
        </DialogHeader>

        {runQuery.isError ? (
          <ErrorState title="Payroll run could not be loaded" onRetry={() => void runQuery.refetch()} />
        ) : runQuery.isLoading || !run ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Pay period</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-foreground">
                    {run.periodLabel} · {run.id}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Employees</p>
                  <p className="mt-0.5 text-[13px] font-medium tabular-nums text-slate-700">
                    {run.employeeCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Gross</p>
                  <p className="mt-0.5 text-[13px] font-medium tabular-nums text-slate-700">
                    {formatCurrency(run.grossTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Deductions</p>
                  <p className="mt-0.5 text-[13px] font-medium tabular-nums text-slate-700">
                    {formatCurrency(run.deductionsTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net payroll</p>
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(run.netTotal)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Processed on: {run.processedOn ? formatDate(run.processedOn) : 'Not processed yet'}
              </p>
            </div>

            {canManagePayroll ? (
              <div className="flex flex-wrap gap-2">
                {run.status === 'Draft' || run.status === 'Processing' ? (
                  <Button size="sm" onClick={() => onProcess(run)}>
                    <PlayCircle />
                    Process payroll
                  </Button>
                ) : null}
                {run.status === 'Processed' ? (
                  <Button size="sm" variant="success" onClick={() => onPay(run)}>
                    <CheckCircle2 />
                    Mark as paid
                  </Button>
                ) : null}
                {run.status === 'Paid' ? (
                  <p className="text-[11.5px] text-emerald-700">
                    This run is marked paid. No bank transfer has occurred.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] leading-relaxed text-slate-600">
                Your role can view this run but cannot process payroll or mark it paid. Access is enforced by the API.
              </p>
            )}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Payslips · {payslipsQuery.data?.length ?? 0}
              </p>
              {payslipsQuery.isError ? (
                <ErrorState title="Payslips could not be loaded" onRetry={() => void payslipsQuery.refetch()} />
              ) : (
                <PayslipTable key={run.id} payslips={payslipsQuery.data ?? []} />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <p className="mr-auto max-w-md text-[10.5px] leading-relaxed text-slate-400">
            Statutory rates are illustrative and not legally compliant. No salary is disbursed by this application.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SalaryStructureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  structure: SalaryStructure | null
  canViewSensitive: boolean
}

export function SalaryStructureDialog({
  open,
  onOpenChange,
  structure,
  canViewSensitive,
}: SalaryStructureDialogProps) {
  const employee = structure ? getEmployeeById(structure.employeeId) : undefined
  const monthlyGross = structure
    ? structure.earnings.reduce((sum, component) => sum + component.amount, 0)
    : 0
  const totalDeductions = structure
    ? structure.deductions.reduce((sum, component) => sum + component.amount, 0)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Salary structure</DialogTitle>
          <DialogDescription>
            Effective-dated salary structure. Amounts are illustrative and not a legal salary record.
          </DialogDescription>
        </DialogHeader>

        {structure ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-slate-50/70 p-3.5">
              <div className="flex items-center gap-2.5">
                {employee ? (
                  <AvatarName
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    subtitle={`${employee.id} · ${employee.departmentId.replace('dept-', '')}`}
                    size="sm"
                  />
                ) : (
                  <p className="text-[13px] font-medium text-slate-700">{structure.employeeId}</p>
                )}
              </div>
              <Badge variant="outline">Effective {formatDate(structure.effectiveFrom)}</Badge>
            </div>

            {!canViewSensitive ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-800">
                Salary amounts are masked for your role. The API applies the same access scope.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Annual CTC</p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                  <SensitiveValue
                    value={formatCurrency(structure.annualCtc)}
                    visible={canViewSensitive}
                    mono={false}
                  />
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Monthly gross</p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                  <SensitiveValue value={formatCurrency(monthlyGross)} visible={canViewSensitive} mono={false} />
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Monthly deductions</p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                  <SensitiveValue
                    value={formatCurrency(totalDeductions)}
                    visible={canViewSensitive}
                    mono={false}
                  />
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-[11.5px] font-semibold text-slate-700">Earnings</p>
                </div>
                <div className="divide-y divide-border px-3">
                  {structure.earnings.map((component) => (
                    <div key={component.id} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                      <span className="text-slate-600">{component.name}</span>
                      <SensitiveValue
                        value={formatCurrency(component.amount)}
                        visible={canViewSensitive}
                        mono={false}
                        className="font-medium text-slate-700"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-[12px]">
                  <span className="font-semibold text-slate-700">Gross</span>
                  <SensitiveValue
                    value={formatCurrency(monthlyGross)}
                    visible={canViewSensitive}
                    mono={false}
                    className="font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-[11.5px] font-semibold text-slate-700">Deductions</p>
                </div>
                <div className="divide-y divide-border px-3">
                  {structure.deductions.map((component) => (
                    <div key={component.id} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        {component.name}
                        {component.statutory ? <Badge variant="secondary">Statutory</Badge> : null}
                      </span>
                      <SensitiveValue
                        value={formatCurrency(component.amount)}
                        visible={canViewSensitive}
                        mono={false}
                        className="font-medium text-slate-700"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-[12px]">
                  <span className="font-semibold text-slate-700">Total deductions</span>
                  <SensitiveValue
                    value={formatCurrency(totalDeductions)}
                    visible={canViewSensitive}
                    mono={false}
                    className="font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <p className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[11px] leading-relaxed text-sky-800">
              Statutory components use illustrative rates. They are not current legal rates and this structure does not
              create any salary entitlement.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
