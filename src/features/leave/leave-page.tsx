import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, FilterX, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { employees, getEmployeeById, getEmployeeName } from '@/data/employees'
import { getLeaveTypeById, leaveTypes } from '@/data/leaves'
import { usePagination } from '@/hooks/use-pagination'
import {
  cancelLeaveRequest,
  fetchLeaveBalances,
  fetchLeavePolicies,
  fetchLeaveRequests,
} from '@/services'
import { DEMO_SNAPSHOT_DATE, formatDate, isoDate } from '@/lib/utils'
import type { LeaveRequest, LeaveStatus } from '@/types'
import { ApplyLeaveDialog, ReviewLeaveDialog } from './leave-dialogs'

const leaveStatuses: LeaveStatus[] = ['Pending', 'Approved', 'Rejected', 'Cancelled']

export function LeavePage() {
  const { role, persona, canApprove } = useRole()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const isEmployee = role === 'employee'
  const isManager = role === 'manager'
  const canApply = Boolean(persona.employeeId) && role !== 'super-admin'

  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    requestedTab === 'my-leave' || requestedTab === 'policies' ? requestedTab : 'requests',
  )
  const [applyOpen, setApplyOpen] = useState(
    () => searchParams.get('action') === 'apply' && Boolean(persona.employeeId) && role !== 'super-admin',
  )
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null)
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null)

  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const scopeKey = isEmployee
    ? `employee:${persona.employeeId ?? 'none'}`
    : isManager
      ? `manager:${persona.employeeId ?? 'none'}`
      : 'all'

  const requestsQuery = useQuery({
    queryKey: ['leave-requests', 'list', scopeKey],
    queryFn: () =>
      fetchLeaveRequests(
        isEmployee
          ? { employeeId: persona.employeeId ?? '__none__' }
          : isManager
            ? { managerId: persona.employeeId ?? '__none__' }
            : {},
      ),
    enabled: !isEmployee || Boolean(persona.employeeId),
  })

  const myRequestsQuery = useQuery({
    queryKey: ['leave-requests', { employeeId: persona.employeeId }],
    queryFn: () => fetchLeaveRequests({ employeeId: persona.employeeId as string }),
    enabled: Boolean(persona.employeeId),
  })

  const balancesQuery = useQuery({
    queryKey: ['leave-balances', persona.employeeId],
    queryFn: () => fetchLeaveBalances(persona.employeeId as string),
    enabled: Boolean(persona.employeeId),
  })

  const policiesQuery = useQuery({
    queryKey: ['leave-policies'],
    queryFn: fetchLeavePolicies,
  })

  const cancelMutation = useMutation({
    mutationFn: (request: LeaveRequest) => cancelLeaveRequest(request.id, request.employeeId),
    onSuccess: (request) => {
      toast.success('Leave request cancelled', {
        description: `${getEmployeeName(request.employeeId)} · ${formatDate(request.fromDate)}. The pending balance has been released.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setCancelTarget(null)
    },
    onError: (error: Error) =>
      toast.error('Could not cancel the leave request', { description: error.message }),
  })

  const scopedRequests = requestsQuery.data ?? []

  const filteredRequests = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return scopedRequests.filter((request) => {
      if (statusFilter !== 'all' && request.status !== statusFilter) return false
      if (typeFilter !== 'all' && request.leaveTypeId !== typeFilter) return false
      if (!query) return true
      const employee = getEmployeeById(request.employeeId)
      const type = getLeaveTypeById(request.leaveTypeId)
      return `${employee?.firstName ?? ''} ${employee?.lastName ?? ''} ${request.employeeId} ${type?.name ?? ''} ${request.reason}`
        .toLowerCase()
        .includes(query)
    })
  }, [scopedRequests, statusFilter, typeFilter, deferredSearch])

  const pagination = usePagination(filteredRequests, 10)

  const applyEmployeeOptions = useMemo(() => {
    if (!persona.employeeId) return []
    const self = employees.find((employee) => employee.id === persona.employeeId)
    if (!self) return []
    if (role === 'employee' || role === 'payroll-admin') return [self]
    if (role === 'manager') {
      return employees.filter(
        (employee) => employee.id === persona.employeeId || employee.managerId === persona.employeeId,
      )
    }
    return employees.filter((employee) => employee.status !== 'Inactive')
  }, [persona.employeeId, role])

  const lockedEmployeeId =
    role === 'employee' || role === 'payroll-admin' ? persona.employeeId : null

  const ownRequests = myRequestsQuery.data ?? []
  const snapshot = isoDate(DEMO_SNAPSHOT_DATE)
  const upcomingRequests = useMemo(
    () =>
      [...ownRequests]
        .filter(
          (request) =>
            (request.status === 'Pending' || request.status === 'Approved') && request.toDate >= snapshot,
        )
        .sort((a, b) => a.fromDate.localeCompare(b.fromDate)),
    [ownRequests, snapshot],
  )
  const pastRequests = useMemo(
    () =>
      [...ownRequests]
        .filter(
          (request) =>
            request.toDate < snapshot || request.status === 'Cancelled' || request.status === 'Rejected',
        )
        .sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
    [ownRequests, snapshot],
  )

  const pendingCount = scopedRequests.filter((request) => request.status === 'Pending').length
  const approvedCount = scopedRequests.filter((request) => request.status === 'Approved').length
  const rejectedCount = scopedRequests.filter((request) => request.status === 'Rejected').length
  const cancelledCount = scopedRequests.filter((request) => request.status === 'Cancelled').length

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || search !== ''
  const resetFilters = () => {
    setStatusFilter('all')
    setTypeFilter('all')
    setSearch('')
  }

  const columns: Array<DataTableColumn<LeaveRequest>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (request) => {
        const employee = getEmployeeById(request.employeeId)
        if (!employee) {
          return (
            <div>
              <p className="font-medium text-slate-700">{request.employeeId}</p>
              <p className="text-[11px] text-slate-400">Employee record unavailable</p>
            </div>
          )
        }
        return (
          <AvatarName
            firstName={employee.firstName}
            lastName={employee.lastName}
            subtitle={`${employee.id} · ${employee.departmentId.replace('dept-', '')}`}
          />
        )
      },
    },
    {
      key: 'type',
      header: 'Leave type',
      cell: (request) => {
        const type = getLeaveTypeById(request.leaveTypeId)
        return (
          <div className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: type?.color ?? '#94a3b8' }}
            />
            <div>
              <p className="font-medium text-slate-700">{type?.name ?? '—'}</p>
              <p className="text-[11px] text-slate-400">{type?.code ?? request.leaveTypeId}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'dates',
      header: 'Dates',
      cell: (request) => (
        <div>
          <p className="text-slate-700">
            {formatDate(request.fromDate, 'dd MMM')} – {formatDate(request.toDate, 'dd MMM yyyy')}
          </p>
          <p className="text-[11px] text-slate-400">{request.days} day(s)</p>
        </div>
      ),
    },
    {
      key: 'days',
      header: 'Days',
      align: 'right',
      cell: (request) => <span className="tabular-nums">{request.days}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (request) => (
        <p className="max-w-56 truncate text-slate-600" title={request.reason}>
          {request.reason}
        </p>
      ),
    },
    {
      key: 'applied',
      header: 'Applied on',
      cell: (request) => <span className="text-slate-600">{formatDate(request.appliedOn)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (request) => <StatusBadge status={request.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (request) => {
        const isOwn = Boolean(persona.employeeId) && request.employeeId === persona.employeeId
        const canReview = canApprove && request.status === 'Pending' && !isOwn
        const canCancel = isOwn && request.status === 'Pending'
        if (!canReview && !canCancel) return <span className="text-slate-300">—</span>
        return (
          <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            {canReview ? (
              <Button variant="outline" size="sm" onClick={() => setReviewTarget(request)}>
                Review
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setCancelTarget(request)}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  const ownColumns: Array<DataTableColumn<LeaveRequest>> = [
    {
      key: 'type',
      header: 'Type',
      cell: (request) => {
        const type = getLeaveTypeById(request.leaveTypeId)
        return (
          <div className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: type?.color ?? '#94a3b8' }}
            />
            <span className="text-slate-700">{type?.name ?? '—'}</span>
          </div>
        )
      },
    },
    {
      key: 'dates',
      header: 'Dates',
      cell: (request) => (
        <span className="text-slate-600">
          {formatDate(request.fromDate, 'dd MMM')} – {formatDate(request.toDate, 'dd MMM yyyy')}
        </span>
      ),
    },
    { key: 'days', header: 'Days', align: 'right', cell: (request) => request.days },
    { key: 'status', header: 'Status', cell: (request) => <StatusBadge status={request.status} /> },
  ]

  const exportRows = filteredRequests.map((request) => ({
    'Request ID': request.id,
    Employee: getEmployeeName(request.employeeId),
    'Employee ID': request.employeeId,
    'Leave type': getLeaveTypeById(request.leaveTypeId)?.name ?? request.leaveTypeId,
    From: request.fromDate,
    To: request.toDate,
    Days: request.days,
    Reason: request.reason,
    'Applied on': request.appliedOn,
    Status: request.status,
    Note: request.note ?? '',
  }))

  const description = isManager
    ? 'Review leave requests from your direct reports and track your own balances.'
    : isEmployee
      ? 'Apply for leave, follow the approval status and review your own balances and request history.'
      : 'Review, approve and audit leave requests across the organisation.'

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isManager ? 'Team leave' : 'Time and attendance'}
        title={isManager ? 'Leave management' : 'Leave'}
        description={description}
        actions={
          <>
            <ExportButton filename="horizon-leave-requests.csv" rows={exportRows} />
            {canApply ? (
              <Button onClick={() => setApplyOpen(true)}>
                <Plus />
                Apply for leave
              </Button>
            ) : null}
          </>
        }
      />

      <DemoNotice>
        Leave requests, approvals and balances are stored by the HRMS API. Access follows your signed-in role and is
        enforced by the server. Balances are maintained by the application and do not by themselves establish a legal
        leave entitlement.
      </DemoNotice>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="my-leave">My leave</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="warning">Pending {pendingCount}</Badge>
              <Badge variant="success">Approved {approvedCount}</Badge>
              <Badge variant="danger">Rejected {rejectedCount}</Badge>
              <Badge variant="secondary">Cancelled {cancelledCount}</Badge>
            </div>

            <Card>
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by employee, ID, leave type or reason…"
                    className="pl-9"
                    aria-label="Search leave requests"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as 'all' | LeaveStatus)}
                  >
                    <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {leaveStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-44" aria-label="Filter by leave type">
                      <SelectValue placeholder="Leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All leave types</SelectItem>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasFilters ? (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="col-span-2 sm:col-span-1">
                      <FilterX />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>

              <DataTable
                columns={columns}
                data={pagination.pageItems}
                rowKey={(request) => request.id}
                isLoading={requestsQuery.isLoading}
                isError={requestsQuery.isError}
                onRetry={() => void requestsQuery.refetch()}
                emptyTitle={hasFilters ? 'No leave requests match these filters' : 'No leave requests yet'}
                emptyDescription={
                  hasFilters
                    ? 'Try a different search term or clear one of the filters.'
                    : 'Requests submitted through this application will appear here.'
                }
                emptyAction={
                  hasFilters ? (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      <FilterX />
                      Clear filters
                    </Button>
                  ) : canApply ? (
                    <Button size="sm" onClick={() => setApplyOpen(true)}>
                      <Plus />
                      Apply for leave
                    </Button>
                  ) : undefined
                }
                footer={
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.setPage}
                    onPageSizeChange={pagination.setPageSize}
                    itemLabel="requests"
                  />
                }
              />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-leave">
          {!persona.employeeId ? (
            <Card>
              <EmptyState
                icon={CalendarDays}
                title="No employee record linked to this account"
                description="This account is a system login without an employee profile, so there are no personal leave balances to show. Sign in with an employee-linked account to use self-service leave."
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {balancesQuery.isError ? (
                <ErrorState
                  title="Leave balances could not be loaded"
                  onRetry={() => void balancesQuery.refetch()}
                />
              ) : balancesQuery.isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : (balancesQuery.data ?? []).length === 0 ? (
                <Card>
                  <EmptyState
                    icon={CalendarDays}
                    title="No leave balances recorded"
                    description="No leave balances are recorded for this employee."
                  />
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(balancesQuery.data ?? []).map((balance) => {
                    const type = getLeaveTypeById(balance.leaveTypeId)
                    const available = Math.max(0, balance.allocated - balance.used - balance.pending)
                    const percent =
                      balance.allocated === 0 ? 0 : (balance.used / balance.allocated) * 100
                    return (
                      <div key={balance.leaveTypeId} className="rounded-xl border border-border bg-white p-4 shadow-card">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: type?.color ?? '#94a3b8' }}
                            />
                            <p className="text-[12.5px] font-semibold text-slate-700">{type?.name ?? balance.leaveTypeId}</p>
                          </div>
                          <Badge variant="outline">{type?.code ?? '—'}</Badge>
                        </div>
                        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{available}</p>
                        <p className="text-[10.5px] text-slate-400">
                          available of {balance.allocated || '—'} allocated day(s)
                        </p>
                        <Progress value={percent} className="mt-3" />
                        <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>Used {balance.used}</span>
                          <span>Pending {balance.pending}</span>
                        </div>
                        {type?.description ? (
                          <p className="mt-2 text-[10.5px] leading-relaxed text-slate-400">{type.description}</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming and active requests</CardTitle>
                    <p className="text-[12px] text-slate-500">
                      Pending and approved leave with an end date on or after {formatDate(DEMO_SNAPSHOT_DATE)}.
                    </p>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <DataTable
                      columns={ownColumns}
                      data={upcomingRequests}
                      rowKey={(request) => request.id}
                      isLoading={myRequestsQuery.isLoading}
                      isError={myRequestsQuery.isError}
                      onRetry={() => void myRequestsQuery.refetch()}
                      emptyTitle="No upcoming leave"
                      emptyDescription="Approved or pending requests for future dates will appear here."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Past requests</CardTitle>
                    <p className="text-[12px] text-slate-500">
                      Completed, rejected or cancelled requests from your leave history.
                    </p>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <DataTable
                      columns={ownColumns}
                      data={pastRequests}
                      rowKey={(request) => request.id}
                      isLoading={myRequestsQuery.isLoading}
                      isError={myRequestsQuery.isError}
                      onRetry={() => void myRequestsQuery.refetch()}
                      emptyTitle="No past leave requests"
                      emptyDescription="Your historical leave requests will appear here."
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Leave types at a glance</CardTitle>
                  <p className="text-[12px] text-slate-500">
                    Descriptions are illustrative and do not represent a legal entitlement.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {leaveTypes.map((type) => (
                      <div key={type.id} className="rounded-lg border border-border p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ backgroundColor: type.color }} />
                            <p className="text-[12.5px] font-medium text-slate-700">{type.name}</p>
                          </div>
                          <Badge variant="outline">{type.code}</Badge>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{type.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="secondary">Quota {type.annualQuota || '—'}</Badge>
                          {type.requiresDocument ? <Badge variant="warning">Document required</Badge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="policies">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] leading-relaxed text-slate-600">
              Policies are read-only here. In a full HRMS, policy configuration would be managed from the Settings
              module with effective-dated versions and approval controls.
            </div>

            {policiesQuery.isError ? (
              <ErrorState title="Leave policies could not be loaded" onRetry={() => void policiesQuery.refetch()} />
            ) : policiesQuery.isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-56 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {(policiesQuery.data ?? []).map((policy) => {
                  const type = getLeaveTypeById(policy.leaveTypeId)
                  if (!type) return null
                  return (
                    <Card key={policy.leaveTypeId}>
                      <CardHeader className="flex-row items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                            <CardTitle>{type.name}</CardTitle>
                          </div>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{type.description}</p>
                        </div>
                        <Badge variant="outline">{type.code}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Accrual</p>
                            <p className="mt-0.5 text-[12px] text-slate-700">{policy.accrual}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Annual quota
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-700">
                              {type.annualQuota > 0 ? `${type.annualQuota} day(s)` : 'Not accrued'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Max consecutive
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-700">{policy.maxConsecutiveDays} day(s)</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Notice period
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-700">
                              {policy.noticePeriodDays === 0 ? 'None' : `${policy.noticePeriodDays} day(s)`}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Half-day allowed
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-700">{policy.allowHalfDay ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Document required
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-700">
                              {type.requiresDocument ? 'Yes — supporting document' : 'No'}
                            </p>
                          </div>
                        </div>
                        <p className="border-t border-border pt-3 text-[11.5px] leading-relaxed text-slate-600">
                          {policy.policy}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ApplyLeaveDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        employeeOptions={applyEmployeeOptions}
        defaultEmployeeId={persona.employeeId}
        lockedEmployeeId={lockedEmployeeId}
      />

      <ReviewLeaveDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => !open && setReviewTarget(null)}
        request={reviewTarget}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this leave request?"
        description={
          cancelTarget ? (
            <>
              <span className="font-medium text-slate-700">
                {getLeaveTypeById(cancelTarget.leaveTypeId)?.name ?? 'Leave'}
              </span>{' '}
              from {formatDate(cancelTarget.fromDate)} to {formatDate(cancelTarget.toDate)} will be cancelled. The
              pending days are released back to the balance. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        destructive
        onConfirm={async () => {
          if (!cancelTarget) return
          try {
            await cancelMutation.mutateAsync(cancelTarget)
          } catch {
            // The mutation's onError handler surfaces the message to the user.
          }
        }}
      />
    </div>
  )
}
