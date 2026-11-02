import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  Eye,
  FilterX,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserRound,
  UserX,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRole } from '@/contexts/role-context'
import { branches, departments, getBranchName, getDepartmentName } from '@/data/organization'
import { designations, getDesignationTitle } from '@/data/designations'
import { fetchEmployeeCounts, fetchEmployees, setEmployeeStatus } from '@/services'
import { EMPLOYEE_EDIT_ROLES } from '@/lib/constants'
import { calculateTenure, formatDate } from '@/lib/utils'
import type { Employee } from '@/types'

function CountChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'default' | 'success' | 'warning' | 'muted'
}) {
  const tones = {
    default: 'bg-primary-50 text-primary-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    muted: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-card">
      <span className={`flex size-7 items-center justify-center rounded-md ${tones[tone]}`}>
        <Users className="size-3.5" />
      </span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[13px] font-semibold leading-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function EmployeeListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { role, persona, canAccess } = useRole()
  const canEdit = EMPLOYEE_EDIT_ROLES.includes(role)
  const isManager = role === 'manager'

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [departmentId, setDepartmentId] = useState('all')
  const [status, setStatus] = useState('all')
  const [designationId, setDesignationId] = useState('all')
  const [branchId, setBranchId] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null)

  const filters = {
    search: deferredSearch,
    departmentId,
    status,
    designationId,
    branchId,
    managerId: isManager ? persona.employeeId ?? undefined : undefined,
    page,
    pageSize,
  }

  const employeesQuery = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => fetchEmployees(filters),
    placeholderData: keepPreviousData,
  })

  const countsQuery = useQuery({
    queryKey: ['employee-counts'],
    queryFn: fetchEmployeeCounts,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: Employee['status'] }) =>
      setEmployeeStatus(id, nextStatus),
    onSuccess: (employee) => {
      toast.success(employee.status === 'Inactive' ? 'Employee deactivated' : 'Employee reactivated', {
        description: `${employee.firstName} ${employee.lastName} is now marked ${employee.status}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['employee-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setStatusTarget(null)
    },
    onError: (error: Error) => toast.error('Could not update the employee', { description: error.message }),
  })

  const resetFilters = () => {
    setSearch('')
    setDepartmentId('all')
    setStatus('all')
    setDesignationId('all')
    setBranchId('all')
    setPage(1)
  }

  const hasFilters =
    search !== '' || departmentId !== 'all' || status !== 'all' || designationId !== 'all' || branchId !== 'all'

  const rows = employeesQuery.data?.data ?? []

  const columns: Array<DataTableColumn<Employee>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (employee) => (
        <AvatarName
          firstName={employee.firstName}
          lastName={employee.lastName}
          subtitle={`${employee.id} · ${employee.employmentType}`}
        />
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (employee) => (
        <div className="max-w-52">
          <p className="truncate font-medium text-slate-700">{getDesignationTitle(employee.designationId)}</p>
          <p className="truncate text-[11px] text-slate-400">{getDepartmentName(employee.departmentId)}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (employee) => (
        <div>
          <p className="text-slate-700">{getBranchName(employee.branchId)}</p>
          <p className="text-[11px] text-slate-400">{employee.workLocation}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (employee) => <StatusBadge status={employee.status} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (employee) => (
        <div>
          <p className="text-slate-700">{formatDate(employee.dateOfJoining)}</p>
          <p className="text-[11px] text-slate-400">{calculateTenure(employee.dateOfJoining)} tenure</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (employee) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${employee.firstName} ${employee.lastName}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}`)}>
                <Eye />
                View profile
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}/edit`)}>
                  <Pencil />
                  Edit details
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant={employee.status === 'Inactive' ? 'default' : 'destructive'}
                    onClick={() => setStatusTarget(employee)}
                  >
                    {employee.status === 'Inactive' ? <UserCheck /> : <UserX />}
                    {employee.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const exportRows = rows.map((employee) => ({
    'Employee ID': employee.id,
    Name: `${employee.firstName} ${employee.lastName}`,
    Email: employee.email,
    Department: getDepartmentName(employee.departmentId),
    Designation: getDesignationTitle(employee.designationId),
    Branch: getBranchName(employee.branchId),
    Status: employee.status,
    'Employment Type': employee.employmentType,
    'Date of Joining': employee.dateOfJoining,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isManager ? 'Team directory' : 'People operations'}
        title={isManager ? 'My team' : 'Employees'}
        description={
          isManager
            ? 'Direct reports for the manager role.'
            : 'Browse the employee directory, review profiles and maintain employee records.'
        }
        actions={
          <>
            <ExportButton filename="horizon-employees-page.csv" rows={exportRows} />
            {canEdit ? (
              <Button asChild>
                <Link to="/employees/new">
                  <Plus />
                  Add employee
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <DemoNotice>
        {isManager
          ? 'Manager view is scoped to your direct reports. Access is enforced by the API.'
          : 'Employee records are stored in the HRMS database and saved through the API.'}
      </DemoNotice>

      <div className="flex flex-wrap gap-2">
        <CountChip label="Total" value={countsQuery.data?.total ?? 0} tone="default" />
        <CountChip label="Active" value={countsQuery.data?.active ?? 0} tone="success" />
        <CountChip label="Probation" value={countsQuery.data?.probation ?? 0} tone="warning" />
        <CountChip label="Inactive" value={countsQuery.data?.inactive ?? 0} tone="muted" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by name, employee ID, email or phone…"
              className="pl-9"
              aria-label="Search employees"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select
              value={departmentId}
              onValueChange={(value) => {
                setDepartmentId(value)
                setPage(1)
              }}
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
              value={designationId}
              onValueChange={(value) => {
                setDesignationId(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by designation">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All designations</SelectItem>
                {designations.map((designation) => (
                  <SelectItem key={designation.id} value={designation.id}>
                    {designation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={branchId}
              onValueChange={(value) => {
                setBranchId(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by branch">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-32" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Probation">Probation</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
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
          data={rows}
          rowKey={(employee) => employee.id}
          isLoading={employeesQuery.isLoading}
          isError={employeesQuery.isError}
          onRetry={() => void employeesQuery.refetch()}
          onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
          emptyTitle={hasFilters ? 'No employees match these filters' : 'No employees yet'}
          emptyDescription={
            hasFilters
              ? 'Try a different search term or clear one of the filters.'
              : 'Add the first employee to start building the directory.'
          }
          emptyAction={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <FilterX />
                Clear filters
              </Button>
            ) : canEdit ? (
              <Button size="sm" asChild>
                <Link to="/employees/new">
                  <Plus />
                  Add employee
                </Link>
              </Button>
            ) : undefined
          }
          footer={
            employeesQuery.data ? (
              <Pagination
                page={employeesQuery.data.page}
                totalPages={employeesQuery.data.totalPages}
                total={employeesQuery.data.total}
                pageSize={employeesQuery.data.pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
                itemLabel="employees"
              />
            ) : null
          }
        />
      </Card>

      {!canAccess('reports') ? (
        <p className="text-[11px] text-slate-400">
          Need aggregate people analytics? Switch to HR Admin or Manager to explore the reports module.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.status === 'Inactive' ? 'Reactivate this employee?' : 'Deactivate this employee?'}
        description={
          statusTarget ? (
            <>
              <span className="font-medium text-slate-700">
                {statusTarget.firstName} {statusTarget.lastName}
              </span>{' '}
              ({statusTarget.id}) will be{' '}
              {statusTarget.status === 'Inactive'
                ? 'returned to active status.'
                : 'marked inactive. Their historical records remain visible, but they will be excluded from active headcount and payroll previews.'}
            </>
          ) : null
        }
        confirmLabel={statusTarget?.status === 'Inactive' ? 'Reactivate employee' : 'Deactivate employee'}
        destructive={statusTarget?.status !== 'Inactive'}
        onConfirm={async () => {
          if (!statusTarget) return
          await statusMutation.mutateAsync({
            id: statusTarget.id,
            nextStatus: statusTarget.status === 'Inactive' ? 'Active' : 'Inactive',
          })
        }}
      />

      <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
        <UserRound className="size-3" />
        Employment status changes are recorded against the employee.
      </p>
    </div>
  )
}
