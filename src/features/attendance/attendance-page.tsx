import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  Clock,
  Coffee,
  FilePenLine,
  FilterX,
  LogIn,
  LogOut,
  Search,
  Sun,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { employees, getEmployeeById } from '@/data/employees'
import { getDesignationTitle } from '@/data/designations'
import { departments, getDepartmentName } from '@/data/organization'
import { getHoliday } from '@/data/attendance'
import {
  ATTENDANCE_SNAPSHOT,
  fetchAttendanceSummary,
  fetchCorrections,
  fetchDailyAttendance,
  fetchEmployeeAttendance,
  fetchHolidays,
  fetchShifts,
  fetchTodayRecord,
  simulateCheckIn,
  simulateCheckOut,
  type AttendanceRow,
} from '@/services'
import { usePagination } from '@/hooks/use-pagination'
import { cn, formatDate, getMonthMatrix } from '@/lib/utils'
import type { AttendanceCorrection, AttendanceRecord, AttendanceStatus } from '@/types'
import {
  CorrectionRequestDialog,
  CorrectionReviewDialog,
  invalidateAttendanceData,
} from './attendance-dialogs'

const MIN_ATTENDANCE_DATE = '2026-08-03'
const CALENDAR_MONTH = 9
const CALENDAR_YEAR = 2026
const CALENDAR_LABEL = 'October 2026'
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CALENDAR_DAYS = getMonthMatrix(CALENDAR_YEAR, CALENDAR_MONTH)

const STATUS_CELL_STYLES: Record<AttendanceStatus, string> = {
  Present: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Late: 'border-amber-200 bg-amber-50 text-amber-800',
  'Half Day': 'border-sky-200 bg-sky-50 text-sky-800',
  Absent: 'border-red-200 bg-red-50 text-red-800',
  'On Leave': 'border-violet-200 bg-violet-50 text-violet-800',
  Holiday: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  Weekend: 'border-slate-200 bg-slate-50 text-slate-500',
}

const LEGEND_STATUSES: AttendanceStatus[] = [
  'Present',
  'Late',
  'Half Day',
  'Absent',
  'On Leave',
  'Holiday',
  'Weekend',
]

const ATTENDANCE_FILTER_STATUSES: AttendanceStatus[] = [
  'Present',
  'Late',
  'Half Day',
  'Absent',
  'On Leave',
  'Holiday',
  'Weekend',
]

function SummaryChip({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  icon: typeof Users
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'purple'
}) {
  const tones = {
    default: 'bg-primary-50 text-primary-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    muted: 'bg-slate-100 text-slate-600',
    purple: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-card">
      <span className={cn('flex size-7 items-center justify-center rounded-md', tones[tone])}>
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[13px] font-semibold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}

function HolidayRow({ holiday }: { holiday: { id: string; name: string; date: string; type: string } }) {
  const day = formatDate(holiday.date, 'dd')
  const month = formatDate(holiday.date, 'MMM')
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-slate-50 text-center">
        <span className="text-[13px] font-semibold leading-none text-slate-700">{day}</span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-slate-700">{holiday.name}</p>
        <p className="text-[11px] text-slate-400">{formatDate(holiday.date, 'EEEE')}</p>
      </div>
      <StatusBadge status={holiday.type} />
    </div>
  )
}

export function AttendancePage() {
  const queryClient = useQueryClient()
  const { role, persona, canApprove } = useRole()
  const isManager = role === 'manager'
  const employeeId = persona.employeeId
  const managerId = isManager ? persona.employeeId ?? undefined : undefined

  const [activeTab, setActiveTab] = useState('register')
  const [date, setDate] = useState(ATTENDANCE_SNAPSHOT)
  const [departmentId, setDepartmentId] = useState('all')
  const [status, setStatus] = useState<AttendanceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceCorrection['status'] | 'all'>('all')
  const [requestDialog, setRequestDialog] = useState<{
    open: boolean
    employeeId?: string
    date?: string
  }>({ open: false })
  const [reviewTarget, setReviewTarget] = useState<{
    correction: AttendanceCorrection
    decision: 'Approved' | 'Rejected'
  } | null>(null)

  const dailyQuery = useQuery({
    queryKey: ['attendance-daily', { date, departmentId, status, search: deferredSearch, managerId }],
    queryFn: () =>
      fetchDailyAttendance({
        date,
        departmentId,
        status,
        search: deferredSearch,
        managerId,
      }),
    placeholderData: keepPreviousData,
  })

  const summaryQuery = useQuery({
    queryKey: ['attendance-summary', date],
    queryFn: () => fetchAttendanceSummary(date),
    placeholderData: keepPreviousData,
  })

  const correctionsQuery = useQuery({
    queryKey: ['attendance-corrections', { status: correctionStatus, managerId }],
    queryFn: () => fetchCorrections({ status: correctionStatus, managerId }),
  })

  const todayQuery = useQuery({
    queryKey: ['attendance-today', employeeId],
    queryFn: () => fetchTodayRecord(employeeId as string),
    enabled: Boolean(employeeId),
  })

  const monthQuery = useQuery({
    queryKey: ['attendance-employee', employeeId, CALENDAR_MONTH, CALENDAR_YEAR],
    queryFn: () => fetchEmployeeAttendance(employeeId as string, CALENDAR_MONTH, CALENDAR_YEAR),
    enabled: Boolean(employeeId),
  })

  const shiftsQuery = useQuery({
    queryKey: ['attendance-shifts'],
    queryFn: fetchShifts,
    enabled: activeTab === 'shifts',
  })

  const holidaysQuery = useQuery({
    queryKey: ['attendance-holidays'],
    queryFn: fetchHolidays,
    enabled: activeTab === 'shifts',
  })

  const correctionEmployees = useMemo(() => {
    const active = employees.filter((employee) => employee.status !== 'Inactive')
    if (role === 'employee' || role === 'payroll-admin') {
      return active.filter((employee) => employee.id === persona.employeeId)
    }
    if (role === 'manager') {
      return active.filter((employee) => employee.managerId === persona.employeeId)
    }
    return active
  }, [role, persona.employeeId])

  const allowedCorrectionIds = useMemo(
    () => new Set(correctionEmployees.map((employee) => employee.id)),
    [correctionEmployees],
  )

  const dailyRows = useMemo(() => dailyQuery.data ?? [], [dailyQuery.data])
  const {
    page: dailyPage,
    pageSize: dailyPageSize,
    total: dailyTotal,
    totalPages: dailyTotalPages,
    setPage: setDailyPage,
    pageItems: dailyPageItems,
  } = usePagination<AttendanceRow>(dailyRows, 12)

  useEffect(() => {
    setDailyPage(1)
  }, [date, departmentId, status, deferredSearch, setDailyPage])

  const correctionRows = useMemo(() => {
    const rows = correctionsQuery.data ?? []
    if (role === 'employee' && persona.employeeId) {
      return rows.filter((correction) => correction.employeeId === persona.employeeId)
    }
    return rows
  }, [correctionsQuery.data, role, persona.employeeId])

  const {
    page: correctionPage,
    pageSize: correctionPageSize,
    total: correctionTotal,
    totalPages: correctionTotalPages,
    setPage: setCorrectionPage,
    pageItems: correctionPageItems,
  } = usePagination<AttendanceCorrection>(correctionRows, 10)

  useEffect(() => {
    setCorrectionPage(1)
  }, [correctionStatus, setCorrectionPage])

  const checkInMutation = useMutation({
    mutationFn: () => simulateCheckIn(employeeId as string),
    onSuccess: (record) => {
      toast.success('Checked in', {
        description: `Check-in recorded at ${record.checkIn ?? '09:06'}.`,
      })
      invalidateAttendanceData(queryClient)
    },
    onError: (error: Error) => toast.error('Could not check in', { description: error.message }),
  })

  const checkOutMutation = useMutation({
    mutationFn: () => simulateCheckOut(employeeId as string),
    onSuccess: (record) => {
      toast.success('Checked out', {
        description: `Check-out recorded at ${record.checkOut ?? '18:14'} with ${record.workedHours ?? 0} worked hours.`,
      })
      invalidateAttendanceData(queryClient)
    },
    onError: (error: Error) => toast.error('Could not check out', { description: error.message }),
  })

  const monthRecords = useMemo(() => monthQuery.data ?? [], [monthQuery.data])
  const todayRecord = todayQuery.data

  const recordsByDate = useMemo(
    () => new Map(monthRecords.map((record) => [record.date, record])),
    [monthRecords],
  )

  const monthSummary = useMemo(() => {
    const counts = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0 }
    for (const record of monthRecords) {
      if (record.status === 'Present') counts.present += 1
      else if (record.status === 'Late') counts.late += 1
      else if (record.status === 'Half Day') counts.halfDay += 1
      else if (record.status === 'Absent') counts.absent += 1
      else if (record.status === 'On Leave') counts.onLeave += 1
    }
    return counts
  }, [monthRecords])

  const recentRecords = useMemo(
    () => [...monthRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [monthRecords],
  )

  const holidayRows = useMemo(() => holidaysQuery.data ?? [], [holidaysQuery.data])
  const upcomingHolidays = holidayRows.filter((holiday) => holiday.date >= ATTENDANCE_SNAPSHOT)
  const pastHolidays = holidayRows.filter((holiday) => holiday.date < ATTENDANCE_SNAPSHOT).reverse()

  const hasDailyFilters =
    date !== ATTENDANCE_SNAPSHOT || departmentId !== 'all' || status !== 'all' || search !== ''

  const resetDailyFilters = () => {
    setDate(ATTENDANCE_SNAPSHOT)
    setDepartmentId('all')
    setStatus('all')
    setSearch('')
  }

  const dailyColumns: Array<DataTableColumn<AttendanceRow>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (row) => (
        <AvatarName
          firstName={row.employee.firstName}
          lastName={row.employee.lastName}
          subtitle={`${row.employee.id} · ${getDesignationTitle(row.employee.designationId)}`}
        />
      ),
    },
    {
      key: 'department',
      header: 'Department',
      cell: (row) => <span className="text-slate-600">{getDepartmentName(row.employee.departmentId)}</span>,
    },
    {
      key: 'checkIn',
      header: 'Check in',
      cell: (row) => <span className="text-slate-700">{row.checkIn ?? '—'}</span>,
    },
    {
      key: 'checkOut',
      header: 'Check out',
      cell: (row) => <span className="text-slate-700">{row.checkOut ?? '—'}</span>,
    },
    {
      key: 'hours',
      header: 'Worked',
      align: 'right',
      cell: (row) => (
        <span className="text-slate-700">{row.workedHours == null ? '—' : `${row.workedHours} h`}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'note',
      header: 'Note',
      cell: (row) =>
        row.note ? (
          <span className="block max-w-52 truncate text-[12px] text-slate-500" title={row.note}>
            {row.note}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    ...(allowedCorrectionIds.size > 0
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (row: AttendanceRow) =>
              allowedCorrectionIds.has(row.employeeId) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setRequestDialog({ open: true, employeeId: row.employeeId, date: row.date })
                  }
                >
                  <FilePenLine />
                  Correction
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  const correctionColumns: Array<DataTableColumn<AttendanceCorrection>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (correction) => {
        const employee = getEmployeeById(correction.employeeId)
        return employee ? (
          <AvatarName
            firstName={employee.firstName}
            lastName={employee.lastName}
            subtitle={`${employee.id} · ${getDepartmentName(employee.departmentId)}`}
          />
        ) : (
          <span className="text-slate-600">{correction.employeeId}</span>
        )
      },
    },
    {
      key: 'date',
      header: 'Date',
      cell: (correction) => (
        <div>
          <p className="text-slate-700">{formatDate(correction.date)}</p>
          <p className="text-[11px] text-slate-400">{formatDate(correction.date, 'EEEE')}</p>
        </div>
      ),
    },
    {
      key: 'change',
      header: 'Current → requested',
      cell: (correction) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={correction.currentStatus} />
          <span className="text-slate-300">→</span>
          <StatusBadge status={correction.requestedStatus} />
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (correction) => (
        <span className="block max-w-64 truncate text-[12px] text-slate-600" title={correction.reason}>
          {correction.reason}
        </span>
      ),
    },
    {
      key: 'requestedOn',
      header: 'Requested on',
      cell: (correction) => <span className="text-slate-600">{formatDate(correction.requestedOn)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (correction) => <StatusBadge status={correction.status} />,
    },
    ...(canApprove
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (correction: AttendanceCorrection) =>
              correction.status === 'Pending' ? (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setReviewTarget({ correction, decision: 'Approved' })}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setReviewTarget({ correction, decision: 'Rejected' })}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <span className="text-slate-300">—</span>
              ),
          },
        ]
      : []),
  ]

  const recentColumns: Array<DataTableColumn<AttendanceRecord>> = [
    {
      key: 'date',
      header: 'Date',
      cell: (record) => (
        <div>
          <p className="text-slate-700">{formatDate(record.date)}</p>
          <p className="text-[11px] text-slate-400">{formatDate(record.date, 'EEEE')}</p>
        </div>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check in',
      cell: (record) => <span className="text-slate-700">{record.checkIn ?? '—'}</span>,
    },
    {
      key: 'checkOut',
      header: 'Check out',
      cell: (record) => <span className="text-slate-700">{record.checkOut ?? '—'}</span>,
    },
    {
      key: 'hours',
      header: 'Worked',
      align: 'right',
      cell: (record) => (
        <span className="text-slate-700">{record.workedHours == null ? '—' : `${record.workedHours} h`}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (record) => <StatusBadge status={record.status} />,
    },
    {
      key: 'note',
      header: 'Note',
      cell: (record) =>
        record.note ? (
          <span className="block max-w-56 truncate text-[12px] text-slate-500" title={record.note}>
            {record.note}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ]

  const dailyExportRows = dailyRows.map((row) => ({
    'Employee ID': row.employee.id,
    Employee: `${row.employee.firstName} ${row.employee.lastName}`,
    Department: getDepartmentName(row.employee.departmentId),
    Date: row.date,
    'Check In': row.checkIn,
    'Check Out': row.checkOut,
    'Worked Hours': row.workedHours,
    Status: row.status,
    Note: row.note,
  }))

  const summary = summaryQuery.data

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Time and attendance"
        title="Attendance"
        description="Review the daily register, manage correction requests and explore shifts, holidays and personal attendance."
      />

      <DemoNotice>
        Attendance is recorded for the {formatDate(ATTENDANCE_SNAPSHOT, 'dd MMMM yyyy')} snapshot date. Access follows
        your signed-in role and is enforced by the API.
      </DemoNotice>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="register">Daily register</TabsTrigger>
          <TabsTrigger value="corrections">Corrections</TabsTrigger>
          <TabsTrigger value="my">My attendance</TabsTrigger>
          <TabsTrigger value="shifts">Shifts &amp; holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card>
            <div className="space-y-3 border-b border-border p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Input
                  type="date"
                  value={date}
                  min={MIN_ATTENDANCE_DATE}
                  max={ATTENDANCE_SNAPSHOT}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="Attendance date"
                  className="w-full sm:w-40"
                />
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Select
                    value={departmentId}
                    onValueChange={(value) => setDepartmentId(value)}
                  >
                    <SelectTrigger className="w-full sm:w-40" aria-label="Filter by department">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as AttendanceStatus | 'all')}
                  >
                    <SelectTrigger className="w-full sm:w-36" aria-label="Filter by attendance status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {ATTENDANCE_FILTER_STATUSES.map((attendanceStatus) => (
                        <SelectItem key={attendanceStatus} value={attendanceStatus}>
                          {attendanceStatus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by employee name or ID…"
                    className="pl-9"
                    aria-label="Search daily attendance"
                  />
                </div>
                {hasDailyFilters ? (
                  <Button variant="ghost" size="sm" onClick={resetDailyFilters}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <SummaryChip
                    label="Total"
                    value={summaryQuery.isLoading ? '—' : summary?.total ?? 0}
                    icon={Users}
                  />
                  <SummaryChip
                    label="Present"
                    value={summaryQuery.isLoading ? '—' : summary?.present ?? 0}
                    icon={UserCheck}
                    tone="success"
                  />
                  <SummaryChip
                    label="Late"
                    value={summaryQuery.isLoading ? '—' : summary?.late ?? 0}
                    icon={Clock}
                    tone="warning"
                  />
                  <SummaryChip
                    label="Absent"
                    value={summaryQuery.isLoading ? '—' : summary?.absent ?? 0}
                    icon={UserX}
                    tone="danger"
                  />
                  <SummaryChip
                    label="On leave"
                    value={summaryQuery.isLoading ? '—' : summary?.onLeave ?? 0}
                    icon={Coffee}
                    tone="purple"
                  />
                  <SummaryChip
                    label="Half day"
                    value={summaryQuery.isLoading ? '—' : summary?.halfDay ?? 0}
                    icon={Sun}
                    tone="muted"
                  />
                  <SummaryChip
                    label="Rate"
                    value={summaryQuery.isLoading ? '—' : `${summary?.rate ?? 0}%`}
                    icon={CalendarCheck2}
                  />
                </div>
                <ExportButton filename={`attendance-${date}.csv`} rows={dailyExportRows} />
              </div>

              {isManager ? (
                <p className="text-[11px] text-slate-400">
                  Showing direct reports for {persona.name}. The summary chips reflect the company-wide
                  snapshot.
                </p>
              ) : null}
            </div>

            <DataTable
              columns={dailyColumns}
              data={dailyPageItems}
              rowKey={(row) => row.id}
              isLoading={dailyQuery.isLoading}
              isError={dailyQuery.isError}
              onRetry={() => void dailyQuery.refetch()}
              emptyTitle={hasDailyFilters ? 'No attendance rows match these filters' : 'No attendance for this date'}
              emptyDescription={
                hasDailyFilters
                  ? 'Try a different date, department, status or search term.'
                  : 'Attendance records are available between 03 Aug 2026 and the snapshot date.'
              }
              emptyAction={
                hasDailyFilters ? (
                  <Button variant="outline" size="sm" onClick={resetDailyFilters}>
                    <FilterX />
                    Clear filters
                  </Button>
                ) : undefined
              }
              footer={
                dailyTotal > 0 ? (
                  <Pagination
                    page={dailyPage}
                    totalPages={dailyTotalPages}
                    total={dailyTotal}
                    pageSize={dailyPageSize}
                    onPageChange={setDailyPage}
                    itemLabel="records"
                  />
                ) : null
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="corrections">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={correctionStatus}
                  onValueChange={(value) =>
                    setCorrectionStatus(value as AttendanceCorrection['status'] | 'all')
                  }
                >
                  <SelectTrigger className="w-full sm:w-40" aria-label="Filter corrections by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11.5px] text-slate-400">
                  {correctionRows.length} {correctionRows.length === 1 ? 'request' : 'requests'}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => setRequestDialog({ open: true })}
                disabled={correctionEmployees.length === 0}
                title={
                  correctionEmployees.length === 0
                    ? 'No employee record is linked to this account.'
                    : 'Submit an attendance correction'
                }
              >
                <FilePenLine />
                Request correction
              </Button>
            </div>

            {isManager ? (
              <p className="border-b border-border px-4 py-2 text-[11px] text-slate-400">
                Corrections are scoped to your direct reports. Access is enforced by the API.
              </p>
            ) : null}

            <DataTable
              columns={correctionColumns}
              data={correctionPageItems}
              rowKey={(correction) => correction.id}
              isLoading={correctionsQuery.isLoading}
              isError={correctionsQuery.isError}
              onRetry={() => void correctionsQuery.refetch()}
              emptyTitle={
                correctionStatus === 'all' ? 'No correction requests' : `No ${correctionStatus.toLowerCase()} requests`
              }
              emptyDescription={
                correctionStatus === 'all'
                  ? 'Attendance correction requests raised by employees will appear here.'
                  : 'Try a different status filter to see other correction requests.'
              }
              footer={
                correctionTotal > 0 ? (
                  <Pagination
                    page={correctionPage}
                    totalPages={correctionTotalPages}
                    total={correctionTotal}
                    pageSize={correctionPageSize}
                    onPageChange={setCorrectionPage}
                    itemLabel="requests"
                  />
                ) : null
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="my">
          {!employeeId ? (
            <Card>
              <EmptyState
                icon={CalendarX2}
                title="No employee record linked to this account"
                description="The Super Admin account is a system account without an employee record. Sign in with an employee-linked account to view personal attendance."
              />
            </Card>
          ) : (
            <div className="space-y-5">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Today</CardTitle>
                    <CardDescription>
                      {formatDate(ATTENDANCE_SNAPSHOT, 'EEEE, dd MMMM yyyy')} · attendance snapshot
                    </CardDescription>
                  </div>
                  {todayRecord ? <StatusBadge status={todayRecord.status} /> : null}
                </CardHeader>
                <CardContent>
                  {todayQuery.isLoading ? (
                    <Skeleton className="h-20 w-full rounded-lg" />
                  ) : todayQuery.isError ? (
                    <ErrorState onRetry={() => void todayQuery.refetch()} />
                  ) : todayRecord ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Check in
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{todayRecord.checkIn ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Check out
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{todayRecord.checkOut ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Worked hours
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {todayRecord.workedHours == null ? '—' : `${todayRecord.workedHours} h`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No attendance record for today"
                      description="Check-in and check-out require an attendance record for the snapshot date."
                    />
                  )}
                </CardContent>
                {!todayQuery.isLoading && !todayQuery.isError && todayRecord ? (
                  <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xl text-[11px] text-slate-400">
                      These actions update your own attendance record for the snapshot date.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => checkInMutation.mutate()}
                        disabled={Boolean(todayRecord.checkIn) || checkInMutation.isPending}
                      >
                        <LogIn />
                        {checkInMutation.isPending ? 'Checking in…' : 'Check in'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkOutMutation.mutate()}
                        disabled={
                          !todayRecord.checkIn ||
                          Boolean(todayRecord.checkOut) ||
                          checkOutMutation.isPending
                        }
                      >
                        <LogOut />
                        {checkOutMutation.isPending ? 'Checking out…' : 'Check out'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Present" value={monthSummary.present} icon={UserCheck} />
                <StatCard label="Late" value={monthSummary.late} icon={Clock} />
                <StatCard label="Half day" value={monthSummary.halfDay} icon={Sun} />
                <StatCard label="Absent" value={monthSummary.absent} icon={UserX} />
                <StatCard label="On leave" value={monthSummary.onLeave} icon={CalendarDays} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{CALENDAR_LABEL} attendance</CardTitle>
                  <CardDescription>
                    Daily status from attendance records. Hover or focus a day for check-in, check-out and worked
                    hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthQuery.isLoading ? (
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 42 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : monthQuery.isError ? (
                    <ErrorState onRetry={() => void monthQuery.refetch()} />
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-7 gap-1.5">
                        {WEEKDAY_LABELS.map((weekday) => (
                          <div
                            key={weekday}
                            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                          >
                            {weekday}
                          </div>
                        ))}
                        {CALENDAR_DAYS.map((day) => {
                          const dateString = format(day, 'yyyy-MM-dd')
                          const inMonth = day.getMonth() === CALENDAR_MONTH
                          const record = inMonth ? recordsByDate.get(dateString) : undefined
                          const holiday = inMonth ? getHoliday(dateString) : undefined
                          const dayOfWeek = day.getDay()
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                          const statusStyle = record ? STATUS_CELL_STYLES[record.status] : ''
                          const title = !inMonth
                            ? format(day, 'dd MMM yyyy')
                            : record
                              ? [
                                  formatDate(dateString, 'EEEE, dd MMM yyyy'),
                                  record.status === 'Holiday' && holiday ? holiday.name : record.status,
                                  record.checkIn ? `In ${record.checkIn}` : null,
                                  record.checkOut ? `Out ${record.checkOut}` : null,
                                  record.workedHours == null ? null : `${record.workedHours} h`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')
                              : holiday
                                ? `${holiday.name} · ${holiday.type} holiday`
                                : isWeekend
                                  ? 'Weekend'
                                  : 'No attendance record'
                          return (
                            <div
                              key={dateString}
                              title={title}
                              aria-label={title}
                              tabIndex={inMonth ? 0 : -1}
                              className={cn(
                                'min-h-16 rounded-lg border p-1.5 text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30 sm:min-h-20 sm:p-2',
                                inMonth
                                  ? statusStyle || 'border-border bg-white text-slate-500'
                                  : 'border-transparent bg-transparent text-slate-300',
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className={cn('text-[11px] font-semibold', !inMonth && 'font-normal')}>
                                  {format(day, 'd')}
                                </span>
                                {record ? (
                                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-current opacity-70" />
                                ) : null}
                              </div>
                              {inMonth ? (
                                <div className="mt-1 space-y-0.5">
                                  <p className="truncate text-[10px] font-medium leading-tight">
                                    {record?.status === 'Holiday' && holiday
                                      ? holiday.name
                                      : record?.status ?? (isWeekend ? 'Weekend' : '—')}
                                  </p>
                                  {record?.workedHours != null ? (
                                    <p className="hidden text-[9.5px] leading-tight opacity-80 sm:block">
                                      {record.workedHours} h
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                        {LEGEND_STATUSES.map((legendStatus) => (
                          <span key={legendStatus} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span
                              className={cn(
                                'size-2.5 rounded-sm border',
                                STATUS_CELL_STYLES[legendStatus],
                              )}
                            />
                            {legendStatus}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent records</CardTitle>
                  <CardDescription>The eight most recent attendance records for October 2026.</CardDescription>
                </CardHeader>
                <DataTable
                  columns={recentColumns}
                  data={recentRecords}
                  rowKey={(record) => record.id}
                  isLoading={monthQuery.isLoading}
                  isError={monthQuery.isError}
                  onRetry={() => void monthQuery.refetch()}
                  emptyTitle="No recent attendance records"
                  emptyDescription="Attendance records for the selected month will appear here."
                  skeletonRows={5}
                />
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="shifts">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Shift schedules</CardTitle>
                <CardDescription>
                  Shift windows and grace periods used by the attendance register.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shiftsQuery.isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-40 rounded-xl" />
                    ))}
                  </div>
                ) : shiftsQuery.isError ? (
                  <ErrorState onRetry={() => void shiftsQuery.refetch()} />
                ) : (shiftsQuery.data ?? []).length === 0 ? (
                  <EmptyState title="No shifts configured" description="Shift schedules will appear here." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(shiftsQuery.data ?? []).map((shift) => (
                      <div key={shift.id} className="rounded-xl border border-border bg-white p-4 shadow-card">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{shift.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{shift.days}</p>
                          </div>
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                            <Clock className="size-4" />
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-semibold tracking-tight text-slate-800">
                          {shift.startTime} – {shift.endTime}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{shift.graceMinutes} min grace</Badge>
                          <Badge variant="secondary">{shift.assignedCount} assigned</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming holidays</CardTitle>
                  <CardDescription>Holidays on or after the 30 Oct 2026 snapshot.</CardDescription>
                </CardHeader>
                <CardContent>
                  {holidaysQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : holidaysQuery.isError ? (
                    <ErrorState onRetry={() => void holidaysQuery.refetch()} />
                  ) : upcomingHolidays.length === 0 ? (
                    <EmptyState title="No upcoming holidays" description="Future holidays will appear here." />
                  ) : (
                    <div className="divide-y divide-border">
                      {upcomingHolidays.map((holiday) => (
                        <HolidayRow key={holiday.id} holiday={holiday} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Past holidays</CardTitle>
                  <CardDescription>Holidays observed earlier in the 2026 calendar.</CardDescription>
                </CardHeader>
                <CardContent>
                  {holidaysQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : holidaysQuery.isError ? (
                    <ErrorState onRetry={() => void holidaysQuery.refetch()} />
                  ) : pastHolidays.length === 0 ? (
                    <EmptyState title="No past holidays" description="Earlier holidays will appear here." />
                  ) : (
                    <div className="scrollbar-thin max-h-[420px] divide-y divide-border overflow-y-auto pr-1">
                      {pastHolidays.map((holiday) => (
                        <HolidayRow key={holiday.id} holiday={holiday} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CorrectionRequestDialog
        open={requestDialog.open}
        onOpenChange={(open) => setRequestDialog((current) => ({ ...current, open }))}
        employees={correctionEmployees}
        defaultEmployeeId={requestDialog.employeeId ?? employeeId ?? undefined}
        defaultDate={requestDialog.date ?? date}
      />

      <CorrectionReviewDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null)
        }}
        correction={reviewTarget?.correction ?? null}
        decision={reviewTarget?.decision ?? 'Approved'}
      />
    </div>
  )
}
