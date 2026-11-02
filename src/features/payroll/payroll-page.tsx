import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  PlayCircle,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { DetailItem, DetailList } from '@/components/common/detail-list'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { SensitiveValue } from '@/components/common/sensitive-value'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { getEmployeeById } from '@/data/employees'
import { statutoryConfig } from '@/data/payroll'
import { usePagination } from '@/hooks/use-pagination'
import {
  downloadPayslipDemo,
  fetchEmployeePayslips,
  fetchPayrollDashboard,
  fetchPayrollRuns,
  fetchPayrollSettings,
  fetchSalaryStructures,
  markPayrollPaid,
  processPayrollRun,
} from '@/services'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PayrollRun, Payslip, SalaryStructure } from '@/types'
import { PayrollRunDialog, SalaryStructureDialog } from './payroll-dialogs'

interface PendingPayrollAction {
  type: 'process' | 'pay'
  runId: string
  periodLabel: string
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`
}

function payslipPeriod(slip: Payslip): string {
  return formatDate(new Date(slip.year, slip.month - 1, 1), 'MMMM yyyy')
}

export function PayrollPage() {
  const { role, persona, canAccess, canManagePayroll, canViewSensitive } = useRole()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const isEmployee = role === 'employee'
  const hasAccess = canAccess('payroll')
  const requestedTab = searchParams.get('tab')

  const initialTab = isEmployee
    ? requestedTab === 'payslips' || requestedTab === 'structures' || requestedTab === 'statutory'
      ? requestedTab
      : 'overview'
    : requestedTab === 'runs' || requestedTab === 'preview' || requestedTab === 'structures' || requestedTab === 'statutory'
      ? requestedTab === 'preview'
        ? 'runs'
        : requestedTab
      : 'overview'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null)
  const [confirmAction, setConfirmAction] = useState<PendingPayrollAction | null>(null)
  const [structureSearch, setStructureSearch] = useState('')
  const deferredStructureSearch = useDeferredValue(structureSearch)

  const dashboardQuery = useQuery({
    queryKey: ['payroll-dashboard'],
    queryFn: fetchPayrollDashboard,
    enabled: hasAccess && !isEmployee,
  })

  const employeePayslipsQuery = useQuery({
    queryKey: ['payslips', 'employee', persona.employeeId],
    queryFn: () => fetchEmployeePayslips(persona.employeeId as string),
    enabled: hasAccess && isEmployee && Boolean(persona.employeeId),
  })

  const runsQuery = useQuery({
    queryKey: ['payroll-runs', 'list'],
    queryFn: fetchPayrollRuns,
    enabled: hasAccess && !isEmployee,
  })

  const structuresQuery = useQuery({
    queryKey: ['salary-structures'],
    queryFn: fetchSalaryStructures,
    enabled: hasAccess,
  })

  const settingsQuery = useQuery({
    queryKey: ['payroll-settings'],
    queryFn: fetchPayrollSettings,
    enabled: hasAccess,
  })

  const payrollMutation = useMutation({
    mutationFn: (target: PendingPayrollAction) =>
      target.type === 'process' ? processPayrollRun(target.runId) : markPayrollPaid(target.runId),
    onSuccess: (run, target) => {
      toast.success(target.type === 'process' ? 'Payroll run processed' : 'Payroll run marked paid', {
        description: `${run.periodLabel} · ${formatCurrency(run.netTotal)} net. No salary has been disbursed by this application.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['payslips'] })
      setConfirmAction(null)
    },
    onError: (error: Error) =>
      toast.error('Could not update the payroll run', { description: error.message }),
  })

  const employeePayslips = useMemo(
    () =>
      [...(employeePayslipsQuery.data ?? [])].sort(
        (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
      ),
    [employeePayslipsQuery.data],
  )
  const latestPayslip = employeePayslips[0]
  const payslipsPagination = usePagination(employeePayslips, 10)

  const runs = runsQuery.data ?? []
  const runsPagination = usePagination(runs, 10)

  const allStructures = structuresQuery.data ?? []
  const visibleStructures = useMemo(() => {
    const scoped = isEmployee
      ? allStructures.filter((structure) => structure.employeeId === persona.employeeId)
      : allStructures
    const query = deferredStructureSearch.trim().toLowerCase()
    if (!query) return scoped
    return scoped.filter((structure) => {
      const employee = getEmployeeById(structure.employeeId)
      return `${employee?.firstName ?? ''} ${employee?.lastName ?? ''} ${structure.employeeId}`
        .toLowerCase()
        .includes(query)
    })
  }, [allStructures, isEmployee, persona.employeeId, deferredStructureSearch])
  const structuresPagination = usePagination(visibleStructures, 10)

  const handleProcess = (run: PayrollRun) =>
    setConfirmAction({ type: 'process', runId: run.id, periodLabel: run.periodLabel })

  const handlePay = (run: PayrollRun) =>
    setConfirmAction({ type: 'pay', runId: run.id, periodLabel: run.periodLabel })

  const downloadSlip = async (slip: Payslip) => {
    try {
      await downloadPayslipDemo(slip.employeeId, slip.payrollRunId)
      toast.success('Payslip downloaded', {
        description: `${payslipPeriod(slip)} · ${slip.employeeId}`,
      })
    } catch (error) {
      toast.error('Could not download the payslip', {
        description: error instanceof Error ? error.message : 'The payslip could not be downloaded.',
      })
    }
  }

  const structureColumns: Array<DataTableColumn<SalaryStructure>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (structure) => {
        const employee = getEmployeeById(structure.employeeId)
        if (!employee) {
          return <span className="font-medium text-slate-700">{structure.employeeId}</span>
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
      key: 'annualCtc',
      header: 'Annual CTC',
      align: 'right',
      cell: (structure) => (
        <SensitiveValue
          value={formatCurrency(structure.annualCtc)}
          visible={canViewSensitive}
          mono={false}
          className="tabular-nums"
        />
      ),
    },
    {
      key: 'monthlyGross',
      header: 'Monthly gross',
      align: 'right',
      cell: (structure) => (
        <SensitiveValue
          value={formatCurrency(
            structure.earnings.reduce((sum, component) => sum + component.amount, 0),
          )}
          visible={canViewSensitive}
          mono={false}
          className="tabular-nums"
        />
      ),
    },
    {
      key: 'effectiveFrom',
      header: 'Effective from',
      cell: (structure) => <span className="text-slate-600">{formatDate(structure.effectiveFrom)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (structure) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => setSelectedStructure(structure)}>
            <Eye />
            View structure
          </Button>
        </div>
      ),
    },
  ]

  const employeePayslipColumns: Array<DataTableColumn<Payslip>> = [
    {
      key: 'period',
      header: 'Pay period',
      cell: (slip) => (
        <div>
          <p className="font-medium text-slate-700">{payslipPeriod(slip)}</p>
          <p className="text-[11px] text-slate-400">{slip.id}</p>
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
      key: 'days',
      header: 'Paid days',
      align: 'right',
      cell: (slip) => (
        <span className="tabular-nums">
          {slip.paidDays} / {slip.workingDays}
        </span>
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
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/payroll/${slip.payrollRunId}/payslip/${slip.employeeId}`}>
              <Eye />
              View
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadSlip(slip)}>
            <Download />
            Download
          </Button>
        </div>
      ),
    },
  ]

  const runColumns: Array<DataTableColumn<PayrollRun>> = [
    {
      key: 'period',
      header: 'Pay period',
      cell: (run) => (
        <div>
          <p className="font-medium text-slate-700">{run.periodLabel}</p>
          <p className="text-[11px] text-slate-400">{run.id}</p>
        </div>
      ),
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      cell: (run) => <span className="tabular-nums">{run.employeeCount}</span>,
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      cell: (run) => <span className="tabular-nums">{formatCurrency(run.grossTotal)}</span>,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      cell: (run) => <span className="tabular-nums">{formatCurrency(run.deductionsTotal)}</span>,
    },
    {
      key: 'net',
      header: 'Net payroll',
      align: 'right',
      cell: (run) => (
        <span className="font-medium tabular-nums text-slate-800">{formatCurrency(run.netTotal)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: 'processed',
      header: 'Processed on',
      cell: (run) => (
        <span className="text-slate-600">{run.processedOn ? formatDate(run.processedOn) : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (run) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => setSelectedRunId(run.id)}>
            <Eye />
            Open
          </Button>
          {canManagePayroll && (run.status === 'Draft' || run.status === 'Processing') ? (
            <Button variant="outline" size="sm" onClick={() => handleProcess(run)}>
              <PlayCircle />
              Process
            </Button>
          ) : null}
          {canManagePayroll && run.status === 'Processed' ? (
            <Button variant="success" size="sm" onClick={() => handlePay(run)}>
              <CheckCircle2 />
              Mark paid
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  if (!hasAccess) {
    return (
      <div className="space-y-5">
        <PageHeader title="Payroll" description="Payroll is not available for your role." />
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="Payroll access restricted"
            description="Your role does not have access to payroll. Payroll is available to Employee self-service, HR Admin, Payroll Admin and Super Admin accounts. Access is enforced by the API."
            action={
              <Button variant="outline" asChild>
                <Link to="/">Back to dashboard</Link>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const currentRun = dashboardQuery.data?.currentRun
  const isProcessConfirm = confirmAction?.type === 'process'

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isEmployee ? 'Employee self-service' : 'Payroll operations'}
        title={isEmployee ? 'My payroll' : 'Payroll'}
        description={
          isEmployee
            ? 'View your payslips and compensation summary. Only your own payroll records are shown.'
            : 'Monitor payroll runs, review salary structures and inspect the illustrative statutory profile.'
        }
        actions={
          isEmployee && latestPayslip ? (
            <Button variant="outline" onClick={() => downloadSlip(latestPayslip)}>
              <Download />
              Latest payslip
            </Button>
          ) : !isEmployee && currentRun ? (
            <Button variant="outline" onClick={() => setSelectedRunId(currentRun.id)}>
              <Eye />
              Open current run
            </Button>
          ) : undefined
        }
      />

      <DemoNotice>
        Payroll figures come from stored payroll runs. Statutory rates are illustrative, not current legal rates and not
        legally compliant. No salary, tax or contribution is disbursed or filed by this application.
      </DemoNotice>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isEmployee ? <TabsTrigger value="payslips">My payslips</TabsTrigger> : null}
          {!isEmployee ? <TabsTrigger value="runs">Payroll runs</TabsTrigger> : null}
          <TabsTrigger value="structures">{isEmployee ? 'My salary structure' : 'Salary structures'}</TabsTrigger>
          <TabsTrigger value="statutory">Statutory &amp; settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isEmployee ? (
            employeePayslipsQuery.isError ? (
              <ErrorState title="Your payslips could not be loaded" onRetry={() => void employeePayslipsQuery.refetch()} />
            ) : employeePayslipsQuery.isLoading ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-56 rounded-xl" />
              </div>
            ) : !latestPayslip ? (
              <Card>
                <EmptyState
                  icon={Wallet}
                  title="No payslips available yet"
                  description="Your payslips will appear here once a payroll run has been processed for you."
                />
              </Card>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Latest net pay"
                    value={formatCurrency(latestPayslip.net)}
                    icon={Wallet}
                    hint={`${payslipPeriod(latestPayslip)} · ${latestPayslip.status}`}
                  />
                  <StatCard
                    label="Gross earnings"
                    value={formatCurrency(latestPayslip.gross)}
                    icon={Banknote}
                    hint="Latest payslip"
                    iconClassName="bg-sky-50 text-sky-600"
                  />
                  <StatCard
                    label="Deductions"
                    value={formatCurrency(latestPayslip.totalDeductions)}
                    icon={ReceiptText}
                    hint="Illustrative statutory deductions"
                    iconClassName="bg-amber-50 text-amber-600"
                  />
                  <StatCard
                    label="Paid days"
                    value={`${latestPayslip.paidDays} / ${latestPayslip.workingDays}`}
                    icon={CalendarCheck2}
                    hint={`LOP ${latestPayslip.lop} day(s)`}
                    iconClassName="bg-violet-50 text-violet-600"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle>Latest payslip</CardTitle>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                          {payslipPeriod(latestPayslip)} · {latestPayslip.id}
                        </p>
                      </div>
                      <StatusBadge status={latestPayslip.status} />
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">
                            Net pay
                          </p>
                          <p className="mt-1 text-xl font-semibold tracking-tight text-emerald-800">
                            {formatCurrency(latestPayslip.net)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                            Gross
                          </p>
                          <p className="mt-1 text-[15px] font-medium tabular-nums text-slate-700">
                            {formatCurrency(latestPayslip.gross)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                            Deductions
                          </p>
                          <p className="mt-1 text-[15px] font-medium tabular-nums text-slate-700">
                            {formatCurrency(latestPayslip.totalDeductions)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" asChild>
                          <Link to={`/payroll/${latestPayslip.payrollRunId}/payslip/${latestPayslip.employeeId}`}>
                            <Eye />
                            View payslip
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadSlip(latestPayslip)}>
                          <Download />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Self-service scope</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-[12px] leading-relaxed text-slate-600">
                      <p>
                        Only your payslips and your own salary structure are shown. Organisation-wide payroll runs and
                        other employees' records are hidden for Employee self-service. Access is enforced by the API.
                      </p>
                      <p>
                        Payslip amounts come from stored payroll runs. Deductions use illustrative statutory rates and
                        do not represent a real tax computation.
                      </p>
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        No salary is transferred or paid by this application.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          ) : dashboardQuery.isError ? (
            <ErrorState title="Payroll dashboard could not be loaded" onRetry={() => void dashboardQuery.refetch()} />
          ) : dashboardQuery.isLoading || !dashboardQuery.data || !currentRun ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="Current run status"
                  value={currentRun.status}
                  icon={PlayCircle}
                  hint={currentRun.periodLabel}
                />
                <StatCard
                  label="Net payroll this month"
                  value={formatCurrency(currentRun.netTotal, true)}
                  icon={Wallet}
                  hint={currentRun.periodLabel}
                  iconClassName="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                  label="Active employees"
                  value={dashboardQuery.data.activeCount}
                  icon={Users}
                  hint={`${currentRun.employeeCount} in current run`}
                  iconClassName="bg-sky-50 text-sky-600"
                />
                <StatCard
                  label="YTD net payroll"
                  value={formatCurrency(dashboardQuery.data.ytdNet, true)}
                  icon={TrendingUp}
                  hint="Paid runs in FY 2026–27"
                  iconClassName="bg-violet-50 text-violet-600"
                />
                <StatCard
                  label="Pending runs"
                  value={dashboardQuery.data.pendingRuns}
                  icon={Clock}
                  hint="Draft or processing"
                  iconClassName="bg-amber-50 text-amber-600"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{currentRun.periodLabel} payroll</CardTitle>
                        <StatusBadge status={currentRun.status} />
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {currentRun.employeeCount} employees · {currentRun.id}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRunId(currentRun.id)}>
                        <Eye />
                        Open run
                      </Button>
                      {canManagePayroll &&
                      (currentRun.status === 'Draft' || currentRun.status === 'Processing') ? (
                        <Button size="sm" onClick={() => handleProcess(currentRun)}>
                          <PlayCircle />
                          Process payroll
                        </Button>
                      ) : null}
                      {canManagePayroll && currentRun.status === 'Processed' ? (
                        <Button size="sm" variant="success" onClick={() => handlePay(currentRun)}>
                          <CheckCircle2 />
                          Mark paid
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Gross</p>
                        <p className="mt-1 text-[15px] font-medium tabular-nums text-slate-700">
                          {formatCurrency(currentRun.grossTotal)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                          Deductions
                        </p>
                        <p className="mt-1 text-[15px] font-medium tabular-nums text-slate-700">
                          {formatCurrency(currentRun.deductionsTotal)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">
                          Net payroll
                        </p>
                        <p className="mt-1 text-[15px] font-semibold tabular-nums text-emerald-800">
                          {formatCurrency(currentRun.netTotal)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500">
                      {currentRun.processedOn
                        ? `Processed on ${formatDate(currentRun.processedOn)}.`
                        : 'This run has not been processed yet.'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Role and controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-[12px] leading-relaxed text-slate-600">
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-slate-50/70 px-3 py-2.5">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <p>
                        {canManagePayroll
                          ? 'You can process draft runs and mark processed runs as paid. Access is enforced by the API.'
                          : 'Your role has view-only payroll access. Processing and payment actions are hidden.'}
                      </p>
                    </div>
                    <p>
                      Payroll actions are saved to the HRMS database. They do not create bank files, statutory filings or
                      real payments.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      YTD gross: {formatCurrency(dashboardQuery.data.ytdGross, true)} · pending runs:{' '}
                      {dashboardQuery.data.pendingRuns}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {isEmployee ? (
          <TabsContent value="payslips">
            <Card>
              <CardHeader>
                <CardTitle>Payslip history</CardTitle>
                <p className="text-[12px] text-slate-500">
                  Only your payslips are listed. Open a payslip for the full breakdown or download a copy.
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DataTable
                  columns={employeePayslipColumns}
                  data={payslipsPagination.pageItems}
                  rowKey={(slip) => slip.id}
                  isLoading={employeePayslipsQuery.isLoading}
                  isError={employeePayslipsQuery.isError}
                  onRetry={() => void employeePayslipsQuery.refetch()}
                  emptyTitle="No payslips available"
                  emptyDescription="Payslips appear once a payroll run has been processed for you."
                  footer={
                    <Pagination
                      page={payslipsPagination.page}
                      totalPages={payslipsPagination.totalPages}
                      total={payslipsPagination.total}
                      pageSize={payslipsPagination.pageSize}
                      onPageChange={payslipsPagination.setPage}
                      onPageSizeChange={payslipsPagination.setPageSize}
                      itemLabel="payslips"
                    />
                  }
                />
                <p className="border-t border-border px-5 py-3 text-[10.5px] leading-relaxed text-slate-400">
                  Payslip figures come from processed payroll runs. Statutory deductions are illustrative, not legally
                  compliant, and no salary is disbursed by this application.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value="runs">
            <Card>
              <CardHeader>
                <CardTitle>Payroll runs</CardTitle>
                <p className="text-[12px] text-slate-500">
                  Open a run to review its payslips and run summary.
                  {canManagePayroll
                    ? ' Process and payment actions are restricted to Payroll Admin and Super Admin roles.'
                    : ' Your role is view-only for payroll.'}
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DataTable
                  columns={runColumns}
                  data={runsPagination.pageItems}
                  rowKey={(run) => run.id}
                  isLoading={runsQuery.isLoading}
                  isError={runsQuery.isError}
                  onRetry={() => void runsQuery.refetch()}
                  onRowClick={(run) => setSelectedRunId(run.id)}
                  emptyTitle="No payroll runs"
                  emptyDescription="Payroll runs will appear here once they are created."
                  footer={
                    <Pagination
                      page={runsPagination.page}
                      totalPages={runsPagination.totalPages}
                      total={runsPagination.total}
                      pageSize={runsPagination.pageSize}
                      onPageChange={runsPagination.setPage}
                      onPageSizeChange={runsPagination.setPageSize}
                      itemLabel="payroll runs"
                    />
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="structures">
          <Card>
            <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{isEmployee ? 'Your salary structure' : 'Salary structures'}</CardTitle>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {isEmployee
                    ? 'Only your own structure is shown in employee self-service.'
                    : 'Effective-dated salary structures. Amounts are illustrative and not a legal salary record.'}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={structureSearch}
                  onChange={(event) => setStructureSearch(event.target.value)}
                  placeholder="Search by employee…"
                  className="pl-9"
                  aria-label="Search salary structures"
                />
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {!canViewSensitive ? (
                <p className="mx-5 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-800">
                  Salary amounts are masked for your role. The API applies the same access scope.
                </p>
              ) : null}
              <DataTable
                columns={structureColumns}
                data={structuresPagination.pageItems}
                rowKey={(structure) => structure.employeeId}
                isLoading={structuresQuery.isLoading}
                isError={structuresQuery.isError}
                onRetry={() => void structuresQuery.refetch()}
                onRowClick={(structure) => setSelectedStructure(structure)}
                emptyTitle="No salary structures"
                emptyDescription="No salary structures match the current scope."
                footer={
                  <Pagination
                    page={structuresPagination.page}
                    totalPages={structuresPagination.totalPages}
                    total={structuresPagination.total}
                    pageSize={structuresPagination.pageSize}
                    onPageChange={structuresPagination.setPage}
                    onPageSizeChange={structuresPagination.setPageSize}
                    itemLabel="structures"
                  />
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statutory">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-slate-400" />
                      <CardTitle>{statutoryConfig.label}</CardTitle>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">{statutoryConfig.description}</p>
                  </div>
                  <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-slate-500">
                    Effective {formatDate(statutoryConfig.effectiveFrom)}
                  </span>
                </CardHeader>
                <CardContent>
                  <DetailList>
                    <DetailItem label="PF employee rate">
                      {formatPercent(statutoryConfig.pfEmployeeRate)}
                    </DetailItem>
                    <DetailItem label="ESI employee rate">
                      {formatPercent(statutoryConfig.esiEmployeeRate)}
                    </DetailItem>
                    <DetailItem label="ESI gross threshold">
                      {formatCurrency(statutoryConfig.esiGrossThreshold)}
                    </DetailItem>
                    <DetailItem label="Professional tax">
                      {formatCurrency(statutoryConfig.professionalTaxMonthly)} / month
                    </DetailItem>
                    <DetailItem label="Illustrative TDS rate">
                      {formatPercent(statutoryConfig.illustrativeTdsRate)}
                    </DetailItem>
                    <DetailItem label="TDS threshold">
                      {formatCurrency(statutoryConfig.tdsThresholdMonthly)} / month
                    </DetailItem>
                  </DetailList>
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    These percentages are illustrative only. They are not current statutory rates, are not legally
                    compliant and must not be used for real payroll.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="size-4 text-slate-400" />
                    <CardTitle>Payroll settings</CardTitle>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    Read-only view of the payroll configuration.
                  </p>
                </CardHeader>
                <CardContent>
                  {settingsQuery.isError ? (
                    <ErrorState
                      title="Payroll settings could not be loaded"
                      onRetry={() => void settingsQuery.refetch()}
                    />
                  ) : settingsQuery.isLoading || !settingsQuery.data ? (
                    <Skeleton className="h-56" />
                  ) : (
                    <DetailList>
                      <DetailItem label="Pay day">Day {settingsQuery.data.payDay} of the month</DetailItem>
                      <DetailItem label="Input cut-off">Day {settingsQuery.data.inputCutoffDay}</DetailItem>
                      <DetailItem label="Approval required">
                        {settingsQuery.data.approvalRequired ? 'Yes' : 'No'}
                      </DetailItem>
                      <DetailItem label="Payslip release">{settingsQuery.data.payslipRelease}</DetailItem>
                      <DetailItem label="Bank file format">{settingsQuery.data.bankFileFormat}</DetailItem>
                      <DetailItem label="Statutory profile">{settingsQuery.data.statutoryProfile}</DetailItem>
                      <DetailItem label="PF rate">{settingsQuery.data.pfRate}%</DetailItem>
                      <DetailItem label="ESI rate">{settingsQuery.data.esiRate}%</DetailItem>
                      <DetailItem label="Professional tax">
                        {formatCurrency(settingsQuery.data.professionalTax)}
                      </DetailItem>
                      <DetailItem label="TDS method">{settingsQuery.data.tdsMethod}</DetailItem>
                    </DetailList>
                  )}
                  {settingsQuery.data ? (
                    <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                      {settingsQuery.data.disclaimer}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-5">
                <p className="text-[12px] leading-relaxed text-slate-600">
                  <span className="font-medium text-slate-700">Effective-dated configuration.</span> Statutory rules and
                  payroll settings would be versioned by financial year and jurisdiction in a production HRMS, with
                  approval controls and effective dates. This page is read-only; the Settings module owns configuration
                  changes in the full product.
                </p>
                <p className="mt-2 text-[10.5px] leading-relaxed text-slate-400">
                  No statutory filing, bank transfer or salary disbursement takes place.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <PayrollRunDialog
        open={Boolean(selectedRunId)}
        runId={selectedRunId}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
        canManagePayroll={canManagePayroll}
        onProcess={handleProcess}
        onPay={handlePay}
      />

      <SalaryStructureDialog
        open={Boolean(selectedStructure)}
        onOpenChange={(open) => !open && setSelectedStructure(null)}
        structure={selectedStructure}
        canViewSensitive={canViewSensitive}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction
            ? isProcessConfirm
              ? `Process ${confirmAction.periodLabel} payroll?`
              : `Mark ${confirmAction.periodLabel} payroll as paid?`
            : 'Update payroll run'
        }
        description={
          confirmAction ? (
            isProcessConfirm ? (
              <>
                This will calculate payslips for{' '}
                <span className="font-medium text-slate-700">{confirmAction.periodLabel}</span> and mark the run
                processed. Statutory amounts remain illustrative and no salary is disbursed.
              </>
            ) : (
              <>
                This will mark <span className="font-medium text-slate-700">{confirmAction.periodLabel}</span> and its
                payslips as paid. No bank transfer or real payment occurs.
              </>
            )
          ) : null
        }
        confirmLabel={isProcessConfirm ? 'Process payroll' : 'Mark as paid'}
        destructive={false}
        onConfirm={async () => {
          if (!confirmAction) return
          try {
            await payrollMutation.mutateAsync(confirmAction)
          } catch {
            // The mutation's onError handler surfaces the message to the user.
          }
        }}
      />
    </div>
  )
}
