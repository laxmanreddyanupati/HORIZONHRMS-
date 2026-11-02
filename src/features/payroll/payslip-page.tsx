import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Download,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { DemoNotice } from '@/components/common/demo-notice'
import { DetailItem, DetailList } from '@/components/common/detail-list'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRole } from '@/contexts/role-context'
import { getDesignationTitle } from '@/data/designations'
import { getBranchName, getDepartmentName } from '@/data/organization'
import { COMPANY } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { downloadPayslipDemo, fetchEmployee, fetchPayrollRun, fetchPayslip } from '@/services'

interface RestrictedPayslipProps {
  title: string
  description: string
}

function RestrictedPayslip({ title, description }: RestrictedPayslipProps) {
  return (
    <div className="space-y-5">
      <PageHeader title="Payslip" description="Payroll document view." />
      <Card>
        <EmptyState
          icon={ShieldCheck}
          title={title}
          description={description}
          action={
            <Button variant="outline" asChild>
              <Link to="/payroll">
                <ArrowLeft />
                Back to payroll
              </Link>
            </Button>
          }
        />
      </Card>
    </div>
  )
}

function PayslipSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function PayslipPage() {
  const { runId, employeeId } = useParams<{ runId: string; employeeId: string }>()
  const { role, persona, canAccess } = useRole()

  const hasAccess = canAccess('payroll')
  const isEmployeeScopeBlocked = role === 'employee' && persona.employeeId !== employeeId
  const canLoad = hasAccess && !isEmployeeScopeBlocked && Boolean(runId) && Boolean(employeeId)

  const payslipQuery = useQuery({
    queryKey: ['payslip', employeeId, runId],
    queryFn: () => fetchPayslip(employeeId as string, runId as string),
    enabled: canLoad,
  })

  const runQuery = useQuery({
    queryKey: ['payroll-run', runId],
    queryFn: () => fetchPayrollRun(runId as string),
    enabled: canLoad,
  })

  const employeeQuery = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployee(employeeId as string),
    enabled: canLoad,
  })

  const handleDownload = async () => {
    if (!employeeId || !runId) return
    try {
      await downloadPayslipDemo(employeeId, runId)
      toast.success('Payslip downloaded', {
        description: `${runQuery.data?.periodLabel ?? 'Pay period'} · ${employeeId}`,
      })
    } catch (error) {
      toast.error('Could not download the payslip', {
        description: error instanceof Error ? error.message : 'The payslip could not be downloaded.',
      })
    }
  }

  if (!hasAccess) {
    return (
      <RestrictedPayslip
        title="Payslip access restricted"
        description="Your role does not have access to payroll. Payroll is available to Employee self-service, HR Admin, Payroll Admin and Super Admin accounts. Access is enforced by the API."
      />
    )
  }

  if (isEmployeeScopeBlocked) {
    return (
      <RestrictedPayslip
        title="Payslip outside your records"
        description="Employee self-service only shows your own payslips. HR Admin and Payroll Admin accounts can view other employees' payslips. Access is enforced by the API."
      />
    )
  }

  if (!runId || !employeeId) {
    return (
      <div className="space-y-5">
        <PageHeader title="Payslip" description="The requested payslip could not be identified." />
        <ErrorState
          title="Payslip not found"
          description="This payslip link is incomplete. Return to payroll and open a payslip from the run or history."
        />
        <Button variant="outline" asChild>
          <Link to="/payroll">
            <ArrowLeft />
            Back to payroll
          </Link>
        </Button>
      </div>
    )
  }

  if (payslipQuery.isLoading || runQuery.isLoading || employeeQuery.isLoading) {
    return <PayslipSkeleton />
  }

  if (payslipQuery.isError || runQuery.isError || employeeQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeader title="Payslip" description="The requested payslip could not be loaded." />
        <ErrorState
          title="Payslip unavailable"
          description="This payslip could not be loaded. It may not exist for the selected payroll run and employee."
          onRetry={() => {
            void payslipQuery.refetch()
            void runQuery.refetch()
            void employeeQuery.refetch()
          }}
        />
        <Button variant="outline" asChild>
          <Link to="/payroll">
            <ArrowLeft />
            Back to payroll
          </Link>
        </Button>
      </div>
    )
  }

  const payslip = payslipQuery.data
  const run = runQuery.data
  const employee = employeeQuery.data

  if (!payslip || !run || !employee) {
    return (
      <div className="space-y-5">
        <PageHeader title="Payslip" description="The requested payslip could not be loaded." />
        <ErrorState
          title="Payslip not found"
          description="No payslip exists for this employee in the selected payroll run. Return to payroll to choose another record."
        />
        <Button variant="outline" asChild>
          <Link to="/payroll">
            <ArrowLeft />
            Back to payroll
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Payroll · ${run.periodLabel}`}
        title={`Payslip — ${run.periodLabel}`}
        description={`${employee.firstName} ${employee.lastName} · ${employee.id} · ${COMPANY.shortName}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/payroll">
                <ArrowLeft />
                Back to payroll
              </Link>
            </Button>
            <Button onClick={handleDownload}>
              <Download />
              Download payslip
            </Button>
          </>
        }
      />

      <DemoNotice>
        This payslip reflects stored payroll run data. Statutory rates are illustrative and are not current legal rates,
        and no salary, tax or contribution is disbursed or filed by this application.
      </DemoNotice>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <Building2 className="size-4" />
              </span>
              <CardTitle>{COMPANY.name}</CardTitle>
            </div>
            <p className="mt-1.5 text-[12px] text-slate-500">
              {COMPANY.location} · {COMPANY.payFrequency} payroll · {COMPANY.currency}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Payslip {payslip.id} · Run {run.id}
            </p>
          </div>
          <StatusBadge status={payslip.status} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Gross earnings</p>
              <p className="mt-1 text-[15px] font-medium tabular-nums text-slate-700">
                {formatCurrency(payslip.gross)}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Total deductions</p>
              <p className="mt-1 text-[15px] font-medium tabular-nums text-slate-700">
                {formatCurrency(payslip.totalDeductions)}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">Net pay</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-emerald-800">
                {formatCurrency(payslip.net)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            {run.processedOn
              ? `Run processed on ${formatDate(run.processedOn)}.`
              : 'This run has not been processed yet.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee details</CardTitle>
            <p className="text-[12px] text-slate-500">Employee and organisational context for this payslip.</p>
          </CardHeader>
          <CardContent>
            <AvatarName
              firstName={employee.firstName}
              lastName={employee.lastName}
              subtitle={`${employee.id} · ${getDepartmentName(employee.departmentId)}`}
              size="lg"
            />
            <DetailList className="mt-4">
              <DetailItem label="Designation">{getDesignationTitle(employee.designationId)}</DetailItem>
              <DetailItem label="Department">{getDepartmentName(employee.departmentId)}</DetailItem>
              <DetailItem label="Branch">{getBranchName(employee.branchId)}</DetailItem>
              <DetailItem label="Work location">{employee.workLocation}</DetailItem>
              <DetailItem label="Employment type">{employee.employmentType}</DetailItem>
              <DetailItem label="Date of joining">{formatDate(employee.dateOfJoining)}</DetailItem>
            </DetailList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pay period &amp; attendance</CardTitle>
            <p className="text-[12px] text-slate-500">Days considered for this payroll calculation.</p>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label="Pay period">{run.periodLabel}</DetailItem>
              <DetailItem label="Payroll run">{run.id}</DetailItem>
              <DetailItem label="Working days">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-slate-400" />
                  {payslip.workingDays} days
                </span>
              </DetailItem>
              <DetailItem label="Paid days">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck2 className="size-3.5 text-slate-400" />
                  {payslip.paidDays} days
                </span>
              </DetailItem>
              <DetailItem label="Loss of pay">{payslip.lop} day(s)</DetailItem>
              <DetailItem label="Processed on">
                {run.processedOn ? formatDate(run.processedOn) : 'Not processed'}
              </DetailItem>
            </DetailList>
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              Attendance figures come from the payroll run record.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-slate-400" />
                <CardTitle>Earnings</CardTitle>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">Monthly salary components for this pay period.</p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslip.earnings.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={2} className="text-center text-slate-400">
                      No earnings recorded for this payslip.
                    </TableCell>
                  </TableRow>
                ) : (
                  payslip.earnings.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>{component.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(component.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="font-medium text-slate-800">Gross earnings</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-slate-800">
                    {formatCurrency(payslip.gross)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <p className="border-t border-border px-5 py-3 text-[10.5px] leading-relaxed text-slate-400">
              Earnings reflect the salary structure stored for this employee.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="size-4 text-slate-400" />
                <CardTitle>Deductions</CardTitle>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">Illustrative statutory and other deductions.</p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslip.deductions.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={2} className="text-center text-slate-400">
                      No deductions recorded for this payslip.
                    </TableCell>
                  </TableRow>
                ) : (
                  payslip.deductions.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {component.name}
                          {component.statutory ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              Statutory
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(component.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="font-medium text-slate-800">Total deductions</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-slate-800">
                    {formatCurrency(payslip.totalDeductions)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <p className="border-t border-border px-5 py-3 text-[10.5px] leading-relaxed text-slate-400">
              Statutory deductions use illustrative rates. They are not current legal rates and are not legally
              compliant.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">
                Net pay for {run.periodLabel}
              </p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums text-emerald-800">
                {formatCurrency(payslip.net)}
              </p>
            </div>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed text-emerald-800/80">
            Gross {formatCurrency(payslip.gross)} minus deductions {formatCurrency(payslip.totalDeductions)}. This
            application does not transfer any salary to a bank account.
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-[10.5px] leading-relaxed text-slate-400">
        Statutory values are illustrative and no salary, tax or contribution has been disbursed or filed by this
        application.
      </p>
    </div>
  )
}
