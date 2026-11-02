import { useQuery } from '@tanstack/react-query'
import {
  Briefcase,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { ErrorState } from '@/components/common/error-state'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchAllReports } from '@/services'
import type { ReportDefinition, ReportId } from '@/services/report-service'
import { cn } from '@/lib/utils'
import { AttendanceChart, DepartmentChart, HeadcountChart, LeaveChart } from './report-charts'

const REPORT_META: Record<ReportId, { label: string; icon: LucideIcon }> = {
  headcount: { label: 'Headcount', icon: Users },
  department: { label: 'Departments', icon: Building2 },
  attendance: { label: 'Attendance', icon: CalendarCheck2 },
  leave: { label: 'Leave', icon: CalendarDays },
  payroll: { label: 'Payroll', icon: Wallet },
  recruitment: { label: 'Recruitment', icon: Briefcase },
}

const CHART_META: Partial<Record<ReportId, { title: string; description: string }>> = {
  headcount: {
    title: 'Headcount by department',
    description: 'Employment status split across each department, excluding the total row.',
  },
  department: {
    title: 'Employees per department',
    description: 'Relative department size in the organisation.',
  },
  attendance: {
    title: 'Attendance by department',
    description: 'Present, absent and leave days recorded in October 2026 to date.',
  },
  leave: {
    title: 'Approved leave days by type',
    description: 'Approved days recorded for each leave type in the current leave year.',
  },
}

function ReportsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-white p-5 shadow-card">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

function ReportChart({ report }: { report: ReportDefinition }) {
  switch (report.id) {
    case 'headcount':
      return <HeadcountChart rows={report.rows} />
    case 'department':
      return <DepartmentChart rows={report.rows} />
    case 'attendance':
      return <AttendanceChart rows={report.rows} />
    case 'leave':
      return <LeaveChart rows={report.rows} />
    default:
      return null
  }
}

function ReportTable({ report }: { report: ReportDefinition }) {
  const columns: Array<DataTableColumn<Record<string, string | number>>> = report.columns.map((column) => ({
    key: column.key,
    header: column.label,
    align: column.align,
    cell: (row) => {
      const value = row[column.key]
      const isTotal = row.department === 'Total'

      if (column.key === 'status') {
        return <StatusBadge status={String(value)} />
      }

      return (
        <span
          className={cn(
            column.align === 'right' && 'tabular-nums',
            isTotal && 'font-semibold text-foreground',
          )}
        >
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </span>
      )
    },
  }))

  return (
    <DataTable
      columns={columns}
      data={report.rows}
      rowKey={(row) => report.columns.map((column) => String(row[column.key] ?? '')).join('|')}
      emptyTitle="No report rows"
      emptyDescription="The API returned an empty dataset for this report."
    />
  )
}

function ReportPanel({ report }: { report: ReportDefinition }) {
  const meta = REPORT_META[report.id]
  const chartMeta = CHART_META[report.id]
  const Icon = meta.icon

  const exportRows = report.rows.map((row) => {
    const record: Record<string, string | number> = {}
    report.columns.forEach((column) => {
      record[column.label] = row[column.key] ?? ''
    })
    return record
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <Icon className="size-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{report.title}</h2>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{report.description}</p>
        </div>
        <ExportButton filename={`horizon-${report.id}-report.csv`} rows={exportRows} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {report.summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={Icon} />
        ))}
      </div>

      {chartMeta ? (
        <Card>
          <CardHeader>
            <CardTitle>{chartMeta.title}</CardTitle>
            <p className="text-[12px] text-slate-500">{chartMeta.description}</p>
          </CardHeader>
          <CardContent>
            <ReportChart report={report} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Detailed breakdown</CardTitle>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {report.rows.length} rows · scroll horizontally to view all columns
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {report.columns.length} columns
          </span>
        </CardHeader>
        <ReportTable report={report} />
      </Card>

      {report.notice ? <p className="text-[10.5px] text-slate-400">{report.notice}</p> : null}
    </div>
  )
}

export function ReportsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchAllReports,
  })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People analytics"
        title="Reports"
        description="Explore headcount, department, attendance, leave, payroll and recruitment summaries."
      />

      <DemoNotice>
        Report figures are organisation-wide metrics generated by the API. Access is limited to roles with reporting
        permission.
      </DemoNotice>

      {isError ? (
        <ErrorState
          title="Reports could not be loaded"
          description="The report pack could not be assembled. Please try again."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <ReportsSkeleton />
      ) : (
        <Tabs defaultValue={data[0]?.id ?? 'headcount'}>
          <TabsList className="w-fit max-w-full">
            {data.map((report) => {
              const meta = REPORT_META[report.id]
              const Icon = meta.icon
              return (
                <TabsTrigger key={report.id} value={report.id}>
                  <Icon className="size-3.5" />
                  {meta.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {data.map((report) => (
            <TabsContent key={report.id} value={report.id}>
              <ReportPanel report={report} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
