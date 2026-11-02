import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  Download,
  FileText,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldAlert,
  Target,
  UserCheck,
  UserX,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { DetailItem, DetailList } from '@/components/common/detail-list'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { Rating } from '@/components/common/rating'
import { SensitiveValue } from '@/components/common/sensitive-value'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { getBranchName, getDepartmentName } from '@/data/organization'
import { getDesignationTitle } from '@/data/designations'
import { getEmployeeName } from '@/data/employees'
import { leaveTypes } from '@/data/leaves'
import {
  downloadPayslipDemo,
  fetchEmployee,
  fetchEmployeeAttendance,
  fetchEmployeePayslips,
  fetchFeedback,
  fetchGoals,
  fetchLeaveBalances,
  fetchLeaveRequests,
  fetchReviews,
  fetchSalaryStructure,
  setEmployeeStatus,
} from '@/services'
import { EMPLOYEE_EDIT_ROLES } from '@/lib/constants'
import { calculateTenure, downloadTextFile, formatCurrency, formatDate } from '@/lib/utils'
import type { AttendanceRecord, EmployeeDocument } from '@/types'

const TABS = [
  { value: 'overview', label: 'Overview', icon: IdCard },
  { value: 'employment', label: 'Job & employment', icon: Briefcase },
  { value: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
  { value: 'leave', label: 'Leave', icon: CalendarDays },
  { value: 'payroll', label: 'Payroll', icon: Wallet },
  { value: 'documents', label: 'Documents', icon: FileText },
  { value: 'performance', label: 'Performance', icon: Target },
  { value: 'bank', label: 'Bank & statutory', icon: Landmark },
]

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function EmployeeProfilePage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { role, persona, canViewSensitive } = useRole()
  const canEdit = EMPLOYEE_EDIT_ROLES.includes(role)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const employeeQuery = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployee(employeeId as string),
    enabled: Boolean(employeeId),
  })

  const employee = employeeQuery.data
  const isManagerScopeBlocked =
    role === 'manager' &&
    Boolean(employee) &&
    employee?.id !== persona.employeeId &&
    employee?.managerId !== persona.employeeId

  const attendanceQuery = useQuery({
    queryKey: ['employee-attendance', employeeId],
    queryFn: () => fetchEmployeeAttendance(employeeId as string, 9, 2026),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const leaveQuery = useQuery({
    queryKey: ['leave-requests', { employeeId }],
    queryFn: () => fetchLeaveRequests({ employeeId }),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const balancesQuery = useQuery({
    queryKey: ['leave-balances', employeeId],
    queryFn: () => fetchLeaveBalances(employeeId as string),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const payslipsQuery = useQuery({
    queryKey: ['employee-payslips', employeeId],
    queryFn: () => fetchEmployeePayslips(employeeId as string),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const goalsQuery = useQuery({
    queryKey: ['goals', employeeId],
    queryFn: () => fetchGoals(employeeId),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const reviewsQuery = useQuery({
    queryKey: ['reviews', { employeeId }],
    queryFn: () => fetchReviews({ employeeId }),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const feedbackQuery = useQuery({
    queryKey: ['feedback', employeeId],
    queryFn: () => fetchFeedback(employeeId),
    enabled: Boolean(employeeId) && !isManagerScopeBlocked,
  })
  const structureQuery = useQuery({
    queryKey: ['salary-structure', employeeId],
    queryFn: () => fetchSalaryStructure(employeeId as string),
    enabled: Boolean(employeeId) && canViewSensitive && !isManagerScopeBlocked,
  })

  const statusMutation = useMutation({
    mutationFn: (nextStatus: 'Active' | 'Inactive') => setEmployeeStatus(employeeId as string, nextStatus),
    onSuccess: (updated) => {
      toast.success(updated.status === 'Inactive' ? 'Employee deactivated' : 'Employee reactivated', {
        description: `${updated.firstName} ${updated.lastName} is now marked ${updated.status}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['employee', employeeId] })
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['employee-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error: Error) => toast.error('Could not update status', { description: error.message }),
  })

  if (employeeQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeader title="Employee profile" description="The requested employee could not be loaded." />
        <ErrorState title="Employee not found" onRetry={() => void employeeQuery.refetch()} />
        <Button variant="outline" asChild>
          <Link to="/employees">
            <ArrowLeft />
            Back to employees
          </Link>
        </Button>
      </div>
    )
  }

  if (employeeQuery.isLoading || !employee) return <ProfileSkeleton />

  if (isManagerScopeBlocked) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-20 text-center shadow-card">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">Outside your team</h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          The Manager role is scoped to direct reports. Access outside that scope is denied by the API.
        </p>
        <Button variant="outline" className="mt-5" asChild>
          <Link to="/employees">
            <ArrowLeft />
            Back to my team
          </Link>
        </Button>
      </div>
    )
  }

  const attendance = [...(attendanceQuery.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const presentDays = attendance.filter((record) => record.status === 'Present' || record.status === 'Late').length
  const absentDays = attendance.filter((record) => record.status === 'Absent').length
  const leaveDays = attendance.filter((record) => record.status === 'On Leave').length
  const halfDays = attendance.filter((record) => record.status === 'Half Day').length
  const avgHours =
    attendance.filter((record) => record.workedHours != null).reduce((sum, record) => sum + (record.workedHours ?? 0), 0) /
    Math.max(1, attendance.filter((record) => record.workedHours != null).length)

  const leaveBalances = balancesQuery.data ?? []
  const payslips = [...(payslipsQuery.data ?? [])].sort((a, b) => b.id.localeCompare(a.id))
  const goals = goalsQuery.data ?? []
  const reviews = reviewsQuery.data ?? []

  const documentColumns: Array<DataTableColumn<EmployeeDocument>> = [
    {
      key: 'name',
      header: 'Document',
      cell: (doc) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="font-medium text-slate-700">{doc.name}</p>
            <p className="text-[11px] text-slate-400">
              {doc.category} · {doc.size}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'uploaded', header: 'Uploaded', cell: (doc) => formatDate(doc.uploadedOn) },
    { key: 'status', header: 'Status', cell: (doc) => <StatusBadge status={doc.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (doc) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            downloadTextFile(
              `${doc.name.replace(/\.[^.]+$/, '')}-${employee.id}.txt`,
              [
                'HORIZON TECHNOLOGIES — DOCUMENT METADATA SUMMARY',
                'This file contains document metadata only.',
                '',
                `Employee: ${employee.firstName} ${employee.lastName} (${employee.id})`,
                `Document: ${doc.name}`,
                `Category: ${doc.category}`,
                `Uploaded: ${formatDate(doc.uploadedOn)}`,
                `Status: ${doc.status}`,
              ].join('\n'),
            )
          }
        >
          <Download />
          Download
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Employee record · ${employee.id}`}
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${getDesignationTitle(employee.designationId)} · ${getDepartmentName(employee.departmentId)} · ${getBranchName(employee.branchId)}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/employees">
                <ArrowLeft />
                Back
              </Link>
            </Button>
            {canEdit ? (
              <Button asChild>
                <Link to={`/employees/${employee.id}/edit`}>
                  <Pencil />
                  Edit employee
                </Link>
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant={employee.status === 'Inactive' ? 'outline' : 'destructive'} onClick={() => setStatusDialogOpen(true)}>
                {employee.status === 'Inactive' ? <UserCheck /> : <UserX />}
                {employee.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
              </Button>
            ) : null}
          </>
        }
      />

      <DemoNotice>
        {role === 'manager'
          ? 'Manager profile view is limited to direct reports. Sensitive bank and statutory data is masked for this role.'
          : 'Employee records are stored in the HRMS database and saved through the API.'}
      </DemoNotice>

      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-linear-to-r from-primary via-sky-500 to-teal-400" />
        <CardContent className="flex flex-col gap-5 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <AvatarName firstName={employee.firstName} lastName={employee.lastName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {employee.firstName} {employee.lastName}
                </h2>
                <StatusBadge status={employee.status} />
                <StatusBadge status={employee.employmentType} />
              </div>
              <p className="mt-1 text-[13px] text-slate-600">
                {getDesignationTitle(employee.designationId)} · {getDepartmentName(employee.departmentId)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {employee.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {employee.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {getBranchName(employee.branchId)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-4 lg:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Manager</p>
              <p className="mt-0.5 font-medium text-slate-700">{getEmployeeName(employee.managerId)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Joined</p>
              <p className="mt-0.5 font-medium text-slate-700">{formatDate(employee.dateOfJoining)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Tenure</p>
              <p className="mt-0.5 font-medium text-slate-700">{calculateTenure(employee.dateOfJoining)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Work location</p>
              <p className="mt-0.5 font-medium text-slate-700">{employee.workLocation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  {employee.about ?? 'No profile summary has been added for this employee.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {employee.skills.length > 0 ? (
                    employee.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-border bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-[12px] text-slate-400">No skills recorded.</p>
                  )}
                </div>
                <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Personal</p>
                    <DetailList className="sm:grid-cols-1">
                      <DetailItem label="Date of birth">{formatDate(employee.dateOfBirth)}</DetailItem>
                      <DetailItem label="Gender">{employee.gender}</DetailItem>
                      <DetailItem label="Marital status">{employee.maritalStatus}</DetailItem>
                      <DetailItem label="Blood group">{employee.bloodGroup}</DetailItem>
                      <DetailItem label="Personal email">{employee.personalEmail}</DetailItem>
                    </DetailList>
                  </div>
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contact</p>
                    <DetailList className="sm:grid-cols-1">
                      <DetailItem label="Address">
                        {employee.address.line1}, {employee.address.city}, {employee.address.state}{' '}
                        {employee.address.postalCode}, {employee.address.country}
                      </DetailItem>
                      <DetailItem label="Work phone">{employee.phone}</DetailItem>
                      <DetailItem label="Emergency contacts">
                        {employee.emergencyContacts.length === 0
                          ? 'None recorded'
                          : employee.emergencyContacts
                              .map((contact) => `${contact.name} (${contact.relationship}) · ${contact.phone}`)
                              .join(' · ')}
                      </DetailItem>
                    </DetailList>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {[...employee.employmentHistory]
                    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                    .map((event, index, list) => (
                      <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {index < list.length - 1 ? (
                          <span className="absolute left-[5px] top-3.5 h-full w-px bg-border" aria-hidden />
                        ) : null}
                        <span className="mt-1 size-2.5 shrink-0 rounded-full border-2 border-white bg-primary ring-1 ring-primary/30" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium text-slate-700">{event.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {event.department} · {formatDate(event.effectiveFrom)}
                            {event.effectiveTo ? ` – ${formatDate(event.effectiveTo)}` : ' – present'}
                          </p>
                          <StatusBadge status={event.type} className="mt-1.5" />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employment">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Job information</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailList className="xl:grid-cols-3">
                  <DetailItem label="Employee ID">{employee.id}</DetailItem>
                  <DetailItem label="Employment type">{employee.employmentType}</DetailItem>
                  <DetailItem label="Status">
                    <StatusBadge status={employee.status} />
                  </DetailItem>
                  <DetailItem label="Department">{getDepartmentName(employee.departmentId)}</DetailItem>
                  <DetailItem label="Designation">{getDesignationTitle(employee.designationId)}</DetailItem>
                  <DetailItem label="Branch">{getBranchName(employee.branchId)}</DetailItem>
                  <DetailItem label="Reporting manager">{getEmployeeName(employee.managerId)}</DetailItem>
                  <DetailItem label="Work location">{employee.workLocation}</DetailItem>
                  <DetailItem label="Date of joining">{formatDate(employee.dateOfJoining)}</DetailItem>
                  <DetailItem label="Confirmation date">
                    {employee.dateOfConfirmation ? formatDate(employee.dateOfConfirmation) : 'Not confirmed'}
                  </DetailItem>
                  <DetailItem label="Tenure">{calculateTenure(employee.dateOfJoining)}</DetailItem>
                  <DetailItem label="Working shift">{employee.shiftId.replace('shift-', '').replace(/-/g, ' ')}</DetailItem>
                </DetailList>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compensation summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canViewSensitive && structureQuery.data ? (
                  <>
                    <div>
                      <p className="text-[10.5px] uppercase tracking-wide text-slate-400">Annual CTC</p>
                      <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                        {formatCurrency(structureQuery.data.annualCtc)}
                      </p>
                    </div>
                    <div className="space-y-1.5 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monthly gross</span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {formatCurrency(structureQuery.data.earnings.reduce((sum, item) => sum + item.amount, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Effective from</span>
                        <span className="font-medium text-slate-700">{formatDate(structureQuery.data.effectiveFrom)}</span>
                      </div>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-slate-400">
                      Salary structure stored by the HRMS. Statutory calculations are illustrative.
                    </p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/payroll">
                        <Wallet />
                        Open payroll
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg border border-border bg-slate-50/70 p-4 text-[12px] leading-relaxed text-slate-500">
                    Compensation details are restricted for the {role} role. Payroll Admin can view salary structures.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Employment history</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'title', header: 'Role / event', cell: (event) => <span className="font-medium text-slate-700">{event.title}</span> },
                    { key: 'department', header: 'Department', cell: (event) => event.department },
                    { key: 'type', header: 'Event', cell: (event) => <StatusBadge status={event.type} /> },
                    { key: 'from', header: 'Effective from', cell: (event) => formatDate(event.effectiveFrom) },
                    { key: 'to', header: 'Effective to', cell: (event) => (event.effectiveTo ? formatDate(event.effectiveTo) : 'Present') },
                  ]}
                  data={[...employee.employmentHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))}
                  rowKey={(event) => event.id}
                  skeletonRows={3}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Present days', value: presentDays, hint: 'Including late days' },
                { label: 'Absent days', value: absentDays, hint: 'October 2026' },
                { label: 'Leave days', value: leaveDays, hint: 'Approved leave reflected' },
                { label: 'Average hours', value: avgHours.toFixed(1), hint: `${halfDays} half day(s)` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-white p-4 shadow-card">
                  <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{item.value}</p>
                  <p className="mt-1 text-[10.5px] text-slate-400">{item.hint}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Attendance records</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">October 2026 · most recent first</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/attendance">
                    <CalendarCheck2 />
                    Open attendance
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DataTable
                  columns={[
                    { key: 'date', header: 'Date', cell: (record: AttendanceRecord) => formatDate(record.date) },
                    { key: 'status', header: 'Status', cell: (record: AttendanceRecord) => <StatusBadge status={record.status} /> },
                    { key: 'in', header: 'Check in', cell: (record: AttendanceRecord) => record.checkIn ?? '—' },
                    { key: 'out', header: 'Check out', cell: (record: AttendanceRecord) => record.checkOut ?? '—' },
                    {
                      key: 'hours',
                      header: 'Worked hours',
                      align: 'right',
                      cell: (record: AttendanceRecord) => (record.workedHours != null ? `${record.workedHours}h` : '—'),
                    },
                    { key: 'note', header: 'Note', cell: (record: AttendanceRecord) => <span className="text-slate-500">{record.note ?? '—'}</span> },
                  ]}
                  data={attendance.slice(0, 14)}
                  rowKey={(record) => record.id}
                  isLoading={attendanceQuery.isLoading}
                  isError={attendanceQuery.isError}
                  onRetry={() => void attendanceQuery.refetch()}
                  skeletonRows={5}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Leave balances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {balancesQuery.isLoading ? (
                  <Skeleton className="h-40" />
                ) : leaveBalances.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No leave balances recorded.</p>
                ) : (
                  leaveBalances.map((balance) => {
                    const type = leaveTypes.find((item) => item.id === balance.leaveTypeId)
                    const available = Math.max(0, balance.allocated - balance.used - balance.pending)
                    const percent = balance.allocated === 0 ? 0 : (balance.used / balance.allocated) * 100
                    return (
                      <div key={balance.leaveTypeId}>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-medium text-slate-700">{type?.name ?? balance.leaveTypeId}</span>
                          <span className="tabular-nums text-slate-500">
                            {available} / {balance.allocated} available
                          </span>
                        </div>
                        <Progress value={percent} className="mt-2" />
                        <p className="mt-1 text-[10.5px] text-slate-400">
                          Used {balance.used} · pending {balance.pending}
                        </p>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Leave requests</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/leave">
                    <CalendarDays />
                    Open leave
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DataTable
                  columns={[
                    {
                      key: 'type',
                      header: 'Type',
                      cell: (request) => leaveTypes.find((type) => type.id === request.leaveTypeId)?.name ?? '—',
                    },
                    {
                      key: 'dates',
                      header: 'Dates',
                      cell: (request) => `${formatDate(request.fromDate)} – ${formatDate(request.toDate)}`,
                    },
                    { key: 'days', header: 'Days', align: 'right', cell: (request) => request.days },
                    { key: 'status', header: 'Status', cell: (request) => <StatusBadge status={request.status} /> },
                  ]}
                  data={leaveQuery.data ?? []}
                  rowKey={(request) => request.id}
                  isLoading={leaveQuery.isLoading}
                  isError={leaveQuery.isError}
                  onRetry={() => void leaveQuery.refetch()}
                  emptyTitle="No leave requests"
                  emptyDescription="This employee has not applied for leave."
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Payslips</CardTitle>
                <p className="mt-0.5 text-[12px] text-slate-500">FY 2026–27 · payroll records</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/payroll">
                  <Wallet />
                  Open payroll
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <DataTable
                columns={[
                  { key: 'period', header: 'Pay period', cell: (slip) => `${formatDate(new Date(slip.year, slip.month - 1, 1), 'MMMM yyyy')}` },
                  { key: 'gross', header: 'Gross', align: 'right', cell: (slip) => formatCurrency(slip.gross) },
                  { key: 'deductions', header: 'Deductions', align: 'right', cell: (slip) => formatCurrency(slip.totalDeductions) },
                  {
                    key: 'net',
                    header: 'Net pay',
                    align: 'right',
                    cell: (slip) => <span className="font-medium text-slate-700">{formatCurrency(slip.net)}</span>,
                  },
                  { key: 'status', header: 'Status', cell: (slip) => <StatusBadge status={slip.status} /> },
                  {
                    key: 'actions',
                    header: '',
                    align: 'right',
                    cell: (slip) => (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/payroll/payslips/${employee.id}/${slip.payrollRunId}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await downloadPayslipDemo(employee.id, slip.payrollRunId)
                            } catch (error) {
                              toast.error('Could not download the payslip', {
                                description:
                                  error instanceof Error ? error.message : 'The payslip could not be downloaded.',
                              })
                            }
                          }}
                        >
                          <Download />
                          Download
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={payslips}
                rowKey={(slip) => slip.id}
                isLoading={payslipsQuery.isLoading}
                isError={payslipsQuery.isError}
                onRetry={() => void payslipsQuery.refetch()}
                emptyTitle="No payslips available"
                emptyDescription="Payslips appear here once a payroll run has been processed."
              />
              <p className="border-t border-border px-5 py-3 text-[10.5px] text-slate-400">
                Payroll figures come from processed runs. Statutory rates are illustrative and not current legal rates.
                No salary is disbursed by this application.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Employee documents</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <DataTable
                columns={documentColumns}
                data={employee.documents}
                rowKey={(doc) => doc.id}
                emptyTitle="No documents uploaded"
                emptyDescription="No document metadata is recorded for this employee."
              />
              <p className="border-t border-border px-5 py-3 text-[10.5px] text-slate-400">
                Downloads generate a metadata summary. Document files are not stored or served by this application.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No goals recorded for this employee.</p>
                ) : (
                  goals.map((goal) => (
                    <div key={goal.id} className="rounded-lg border border-border p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[12.5px] font-medium text-slate-700">{goal.title}</p>
                          <p className="text-[10.5px] text-slate-400">
                            {goal.category} · due {formatDate(goal.dueDate)} · weight {goal.weight}%
                          </p>
                        </div>
                        <StatusBadge status={goal.status} />
                      </div>
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <Progress value={goal.progress} className="flex-1" />
                        <span className="w-9 text-right text-[11px] font-medium tabular-nums text-slate-600">
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No reviews in the active cycle.</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium text-slate-700">{review.type} review</p>
                        <StatusBadge status={review.status} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Rating value={review.rating} />
                        <span className="text-[11px] text-slate-400">{review.rating} / 5</span>
                      </div>
                      {review.summary ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{review.summary}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Feedback</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/performance">
                    <Target />
                    Open performance
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(feedbackQuery.data ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate-400">No feedback recorded.</p>
                ) : (
                  (feedbackQuery.data ?? []).map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.type} />
                          <span className="text-[11px] text-slate-400">from {getEmployeeName(item.fromId)}</span>
                        </div>
                        <span className="text-[10.5px] text-slate-400">{formatDate(item.date)}</span>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{item.message}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Bank account</CardTitle>
                <Landmark className="size-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                {canViewSensitive ? (
                  <DetailList>
                    <DetailItem label="Bank name">{employee.bank?.bankName ?? '—'}</DetailItem>
                    <DetailItem label="Account type">{employee.bank?.accountType ?? '—'}</DetailItem>
                    <DetailItem label="Account number">
                      <span className="font-mono">{employee.bank?.accountNumber ?? '—'}</span>
                    </DetailItem>
                    <DetailItem label="IFSC">
                      <span className="font-mono">{employee.bank?.ifsc ?? '—'}</span>
                    </DetailItem>
                    <DetailItem label="Branch">{employee.bank?.branch ?? '—'}</DetailItem>
                  </DetailList>
                ) : (
                  <div className="space-y-4">
                    <DetailList>
                      <DetailItem label="Bank name">
                        <SensitiveValue value={employee.bank?.bankName} visible={false} />
                      </DetailItem>
                      <DetailItem label="Account number">
                        <SensitiveValue value={employee.bank?.accountNumber} visible={false} />
                      </DetailItem>
                      <DetailItem label="IFSC">
                        <SensitiveValue value={employee.bank?.ifsc} visible={false} />
                      </DetailItem>
                      <DetailItem label="Branch">
                        <SensitiveValue value={employee.bank?.branch} visible={false} />
                      </DetailItem>
                    </DetailList>
                    <p className="rounded-lg bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                      Bank details are masked for the {role} role. The API applies the same access scope.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Statutory identifiers</CardTitle>
                <ShieldAlert className="size-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                {canViewSensitive ? (
                  <DetailList>
                    <DetailItem label="PAN">
                      <span className="font-mono">{employee.statutory?.pan ?? '—'}</span>
                    </DetailItem>
                    <DetailItem label="Aadhaar">
                      <span className="font-mono">{employee.statutory?.aadhaar ?? '—'}</span>
                    </DetailItem>
                    <DetailItem label="UAN">
                      <span className="font-mono">{employee.statutory?.uan ?? '—'}</span>
                    </DetailItem>
                    <DetailItem label="PF number">
                      <span className="font-mono">{employee.statutory?.pfNumber ?? '—'}</span>
                    </DetailItem>
                    <DetailItem label="ESI number">
                      <span className="font-mono">{employee.statutory?.esiNumber ?? '—'}</span>
                    </DetailItem>
                  </DetailList>
                ) : (
                  <div className="space-y-4">
                    <DetailList>
                      <DetailItem label="PAN">
                        <SensitiveValue value={employee.statutory?.pan} visible={false} />
                      </DetailItem>
                      <DetailItem label="Aadhaar">
                        <SensitiveValue value={employee.statutory?.aadhaar} visible={false} />
                      </DetailItem>
                      <DetailItem label="UAN">
                        <SensitiveValue value={employee.statutory?.uan} visible={false} />
                      </DetailItem>
                      <DetailItem label="PF number">
                        <SensitiveValue value={employee.statutory?.pfNumber} visible={false} />
                      </DetailItem>
                      <DetailItem label="ESI number">
                        <SensitiveValue value={employee.statutory?.esiNumber} visible={false} />
                      </DetailItem>
                    </DetailList>
                    <p className="rounded-lg bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                      Statutory identifiers are masked for the {role} role. HR Admin, Super Admin and Payroll Admin can
                      view them.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={employee.status === 'Inactive' ? 'Reactivate this employee?' : 'Deactivate this employee?'}
        description={
          <>
            <span className="font-medium text-slate-700">
              {employee.firstName} {employee.lastName}
            </span>{' '}
            ({employee.id}) will be{' '}
            {employee.status === 'Inactive'
              ? 'returned to active status.'
              : 'marked inactive. Historical records remain visible, but the employee is excluded from active headcount and payroll previews.'}
          </>
        }
        confirmLabel={employee.status === 'Inactive' ? 'Reactivate employee' : 'Deactivate employee'}
        destructive={employee.status !== 'Inactive'}
        onConfirm={async () => {
          await statusMutation.mutateAsync(employee.status === 'Inactive' ? 'Active' : 'Inactive')
        }}
      />

      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
        <span className="rounded-full border border-border bg-white px-2 py-1">
          Profile data from the HRMS database · Asia/Kolkata (IST)
        </span>
        <button type="button" className="text-primary hover:underline" onClick={() => navigate('/employees')}>
          Return to directory
        </button>
      </div>
    </div>
  )
}
