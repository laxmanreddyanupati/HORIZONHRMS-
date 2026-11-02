import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  FilterX,
  Layers3,
  MapPin,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { getEmployeeName } from '@/data/employees'
import { getDepartmentName } from '@/data/organization'
import {
  deleteBranch,
  deleteDepartment,
  deleteDesignation,
  fetchBranchStats,
  fetchDepartmentStats,
  fetchDesignationStats,
  fetchOrgChart,
  fetchReportingLines,
  type DepartmentWithStats,
} from '@/services'
import { ORGANIZATION_EDIT_ROLES, COMPANY } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import {
  BranchDialog,
  DepartmentDialog,
  DesignationDialog,
  invalidateOrganizationData,
  type BranchWithCount,
  type DesignationWithCount,
} from './organization-dialogs'
import { OrgChart } from './org-chart'

type DeleteTarget =
  | { kind: 'department'; item: DepartmentWithStats }
  | { kind: 'designation'; item: DesignationWithCount }
  | { kind: 'branch'; item: BranchWithCount }

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-white p-5 shadow-card">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={label}
      />
    </div>
  )
}

export function OrganizationPage() {
  const queryClient = useQueryClient()
  const { role } = useRole()
  const canEdit = ORGANIZATION_EDIT_ROLES.includes(role)

  const [activeTab, setActiveTab] = useState('overview')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [designationSearch, setDesignationSearch] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const deferredDepartmentSearch = useDeferredValue(departmentSearch)
  const deferredDesignationSearch = useDeferredValue(designationSearch)
  const deferredBranchSearch = useDeferredValue(branchSearch)

  const [departmentDialog, setDepartmentDialog] = useState<{
    open: boolean
    department: DepartmentWithStats | null
  }>({ open: false, department: null })
  const [designationDialog, setDesignationDialog] = useState<{
    open: boolean
    designation: DesignationWithCount | null
  }>({ open: false, designation: null })
  const [branchDialog, setBranchDialog] = useState<{ open: boolean; branch: BranchWithCount | null }>({
    open: false,
    branch: null,
  })
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const departmentsQuery = useQuery({
    queryKey: ['organization-departments'],
    queryFn: fetchDepartmentStats,
  })
  const designationsQuery = useQuery({
    queryKey: ['organization-designations'],
    queryFn: fetchDesignationStats,
  })
  const branchesQuery = useQuery({
    queryKey: ['organization-branches'],
    queryFn: fetchBranchStats,
  })
  const orgChartQuery = useQuery({
    queryKey: ['org-chart'],
    queryFn: fetchOrgChart,
    enabled: activeTab === 'chart',
  })
  const reportingLinesQuery = useQuery({
    queryKey: ['reporting-lines'],
    queryFn: fetchReportingLines,
    enabled: activeTab === 'chart',
  })

  const departmentRows = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data])
  const designationRows = useMemo(() => designationsQuery.data ?? [], [designationsQuery.data])
  const branchRows = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data])

  const filteredDepartments = useMemo(() => {
    const search = deferredDepartmentSearch.trim().toLowerCase()
    if (!search) return departmentRows
    return departmentRows.filter((department) =>
      [department.name, department.code, department.location, getEmployeeName(department.headId)]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [departmentRows, deferredDepartmentSearch])

  const filteredDesignations = useMemo(() => {
    const search = deferredDesignationSearch.trim().toLowerCase()
    if (!search) return designationRows
    return designationRows.filter((designation) =>
      [designation.title, designation.grade, designation.level, getDepartmentName(designation.departmentId)]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [designationRows, deferredDesignationSearch])

  const filteredBranches = useMemo(() => {
    const search = deferredBranchSearch.trim().toLowerCase()
    if (!search) return branchRows
    return branchRows.filter((branch) =>
      [branch.name, branch.city, branch.state, getEmployeeName(branch.headId)]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [branchRows, deferredBranchSearch])

  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.kind === 'department') {
        await deleteDepartment(target.item.id)
      } else if (target.kind === 'designation') {
        await deleteDesignation(target.item.id)
      } else {
        await deleteBranch(target.item.id)
      }
    },
    onSuccess: (_result, target) => {
      const label =
        target.kind === 'department'
          ? target.item.name
          : target.kind === 'designation'
            ? target.item.title
            : target.item.name
      toast.success(`${target.kind === 'branch' ? 'Branch' : target.kind === 'department' ? 'Department' : 'Designation'} deleted`, {
        description: `${label} was removed from the organization.`,
      })
      invalidateOrganizationData(queryClient)
      setDeleteTarget(null)
    },
    onError: (error: Error, target) => {
      toast.error(`Could not delete this ${target.kind}`, { description: error.message })
    },
  })

  const departmentColumns: Array<DataTableColumn<DepartmentWithStats>> = [
    {
      key: 'name',
      header: 'Department',
      cell: (department) => (
        <div className="min-w-40">
          <p className="font-medium text-foreground">{department.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">{department.code}</p>
        </div>
      ),
    },
    {
      key: 'head',
      header: 'Head',
      cell: (department) => (
        <span className={department.headId ? 'text-slate-700' : 'text-slate-400'}>
          {getEmployeeName(department.headId)}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (department) => <span className="text-slate-600">{department.location || '—'}</span>,
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      cell: (department) => <span className="font-medium text-slate-700">{department.employeeCount}</span>,
    },
    {
      key: 'roles',
      header: 'Open roles',
      align: 'right',
      cell: (department) =>
        department.openRoles > 0 ? (
          <Badge variant="warning">{department.openRoles} open</Badge>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (department: DepartmentWithStats) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDepartmentDialog({ open: true, department })}
                  aria-label={`Edit ${department.name}`}
                  title="Edit department"
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteTarget({ kind: 'department', item: department })}
                  aria-label={`Delete ${department.name}`}
                  title="Delete department"
                >
                  <Trash2 />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  const designationColumns: Array<DataTableColumn<DesignationWithCount>> = [
    {
      key: 'title',
      header: 'Designation',
      cell: (designation) => <span className="font-medium text-foreground">{designation.title}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      cell: (designation) => (
        <span className="text-slate-600">{getDepartmentName(designation.departmentId)}</span>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      cell: (designation) => <Badge variant="outline">{designation.level}</Badge>,
    },
    {
      key: 'grade',
      header: 'Grade',
      cell: (designation) => <span className="text-slate-600">{designation.grade}</span>,
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      cell: (designation) => <span className="font-medium text-slate-700">{designation.employeeCount}</span>,
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (designation: DesignationWithCount) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDesignationDialog({ open: true, designation })}
                  aria-label={`Edit ${designation.title}`}
                  title="Edit designation"
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteTarget({ kind: 'designation', item: designation })}
                  aria-label={`Delete ${designation.title}`}
                  title="Delete designation"
                >
                  <Trash2 />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  const branchColumns: Array<DataTableColumn<BranchWithCount>> = [
    {
      key: 'branch',
      header: 'Branch',
      cell: (branch) => (
        <div className="min-w-44">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{branch.name}</p>
            {branch.isHeadquarters ? <Badge variant="info">HQ</Badge> : null}
          </div>
          <p className="text-[11px] text-slate-400">
            {branch.city}, {branch.state}
          </p>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      cell: (branch) => (
        <div>
          <p className="text-slate-700">{branch.city}</p>
          <p className="text-[11px] text-slate-400">{branch.state}</p>
        </div>
      ),
    },
    {
      key: 'head',
      header: 'Branch head',
      cell: (branch) => (
        <span className={branch.headId ? 'text-slate-700' : 'text-slate-400'}>
          {getEmployeeName(branch.headId)}
        </span>
      ),
    },
    {
      key: 'headcount',
      header: 'Headcount',
      align: 'right',
      cell: (branch) => <span className="font-medium text-slate-700">{branch.employeeCount}</span>,
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (branch: BranchWithCount) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBranchDialog({ open: true, branch })}
                  aria-label={`Edit ${branch.name}`}
                  title="Edit branch"
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={branch.isHeadquarters}
                  onClick={() => setDeleteTarget({ kind: 'branch', item: branch })}
                  aria-label={`Delete ${branch.name}`}
                  title={
                    branch.isHeadquarters
                      ? 'The headquarters branch cannot be deleted.'
                      : 'Delete branch'
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  const overviewLoading =
    departmentsQuery.isLoading || designationsQuery.isLoading || branchesQuery.isLoading
  const overviewError = departmentsQuery.isError || designationsQuery.isError || branchesQuery.isError
  const totalHeadcount = branchRows.reduce((sum, branch) => sum + branch.employeeCount, 0)
  const totalOpenRoles = departmentRows.reduce((sum, department) => sum + department.openRoles, 0)
  const maxDepartmentHeadcount = Math.max(1, ...departmentRows.map((department) => department.employeeCount))
  const recentDepartments = [...departmentRows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const headquarters = branchRows.find((branch) => branch.isHeadquarters)
  const reportingManagers = reportingLinesQuery.data ?? []
  const totalReportingLines = reportingManagers.reduce((sum, item) => sum + item.reports.length, 0)

  const deleteLabel =
    deleteTarget?.kind === 'department'
      ? deleteTarget.item.name
      : deleteTarget?.kind === 'designation'
        ? deleteTarget.item.title
        : deleteTarget?.item.name

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People operations"
        title="Organization"
        description="Understand how Horizon Technologies is structured across departments, designations, branches and reporting lines."
      />

      <DemoNotice>
        Organization records reflect the current HRMS data. Changes are saved through the API.
      </DemoNotice>

      {!canEdit ? (
        <DemoNotice>
          You have view-only access in this role. Super Admin, HR Admin and HR Executive roles can create, edit or
          delete organization records. Access is enforced by the server.
        </DemoNotice>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="chart">Org chart</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {overviewLoading ? (
            <OverviewSkeleton />
          ) : overviewError ? (
            <ErrorState
              onRetry={() => {
                void departmentsQuery.refetch()
                void designationsQuery.refetch()
                void branchesQuery.refetch()
              }}
            />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Departments"
                  value={departmentRows.length}
                  hint={`${totalOpenRoles} open ${totalOpenRoles === 1 ? 'role' : 'roles'}`}
                  icon={Building2}
                />
                <StatCard
                  label="Designations"
                  value={designationRows.length}
                  hint="Across all departments"
                  icon={Layers3}
                />
                <StatCard
                  label="Branches"
                  value={branchRows.length}
                  hint={headquarters ? `HQ · ${headquarters.city}` : 'No headquarters set'}
                  icon={MapPin}
                />
                <StatCard
                  label="Total headcount"
                  value={totalHeadcount}
                  hint={`${branchRows.filter((branch) => branch.employeeCount > 0).length} active locations`}
                  icon={Users}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Department distribution</CardTitle>
                    <CardDescription>Employee headcount by department.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {departmentRows.length === 0 ? (
                      <EmptyState title="No departments yet" description="Create a department to see distribution." />
                    ) : (
                      [...departmentRows]
                        .sort((a, b) => b.employeeCount - a.employeeCount)
                        .map((department) => {
                          const width = Math.round((department.employeeCount / maxDepartmentHeadcount) * 100)
                          return (
                            <div key={department.id} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3 text-[12px]">
                                <span className="truncate font-medium text-slate-700">{department.name}</span>
                                <span className="shrink-0 text-slate-500">
                                  {department.employeeCount}{' '}
                                  <span className="text-slate-400">
                                    {department.employeeCount === 1 ? 'person' : 'people'}
                                  </span>
                                </span>
                              </div>
                              <Progress value={width} aria-label={`${department.name} headcount`} />
                            </div>
                          )
                        })
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Branch summary</CardTitle>
                    <CardDescription>Footprint and headcount across office locations.</CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y divide-border">
                    {branchRows.length === 0 ? (
                      <EmptyState title="No branches yet" description="Create a branch to see its summary." />
                    ) : (
                      branchRows.map((branch) => (
                        <div key={branch.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[13px] font-medium text-slate-700">{branch.name}</p>
                              {branch.isHeadquarters ? <Badge variant="info">HQ</Badge> : null}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {branch.city}, {branch.state}
                              {branch.headId ? ` · ${getEmployeeName(branch.headId)}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-[13px] font-semibold text-slate-700">
                            {branch.employeeCount}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent organization updates</CardTitle>
                    <CardDescription>Departments added most recently.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentDepartments.length === 0 ? (
                      <EmptyState title="No updates to show" description="Recent department additions will appear here." />
                    ) : (
                      recentDepartments.map((department) => (
                        <div key={department.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-slate-700">{department.name}</p>
                            <p className="text-[11px] text-slate-400">
                              Head: {getEmployeeName(department.headId)} · {department.location || 'No location'}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            Added {formatDate(department.createdAt, 'dd MMM yyyy')}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization information</CardTitle>
                    <CardDescription>Reference details for the company.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Legal entity</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-700">{COMPANY.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Industry</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-700">{COMPANY.industry}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Headquarters</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-700">
                        {headquarters?.name ?? COMPANY.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Time zone</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-700">{COMPANY.timezone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Financial year</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-700">{COMPANY.financialYear}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pay frequency</p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-700">{COMPANY.payFrequency}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
              <SearchBox
                value={departmentSearch}
                onChange={setDepartmentSearch}
                placeholder="Search by name, code, head or location…"
                label="Search departments"
              />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-[11.5px] text-slate-400">{filteredDepartments.length} departments</span>
                {departmentSearch ? (
                  <Button variant="ghost" size="sm" onClick={() => setDepartmentSearch('')}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" onClick={() => setDepartmentDialog({ open: true, department: null })}>
                    <Plus />
                    Add department
                  </Button>
                ) : null}
              </div>
            </div>
            <DataTable
              columns={departmentColumns}
              data={filteredDepartments}
              rowKey={(department) => department.id}
              isLoading={departmentsQuery.isLoading}
              isError={departmentsQuery.isError}
              onRetry={() => void departmentsQuery.refetch()}
              emptyTitle={departmentSearch ? 'No departments match this search' : 'No departments yet'}
              emptyDescription={
                departmentSearch
                  ? 'Try a different name, code, head or location.'
                  : 'Create the first department to start structuring the organization.'
              }
              emptyAction={
                departmentSearch ? (
                  <Button variant="outline" size="sm" onClick={() => setDepartmentSearch('')}>
                    <FilterX />
                    Clear search
                  </Button>
                ) : canEdit ? (
                  <Button size="sm" onClick={() => setDepartmentDialog({ open: true, department: null })}>
                    <Plus />
                    Add department
                  </Button>
                ) : undefined
              }
              skeletonRows={6}
            />
          </Card>
        </TabsContent>

        <TabsContent value="designations">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
              <SearchBox
                value={designationSearch}
                onChange={setDesignationSearch}
                placeholder="Search by title, department, level or grade…"
                label="Search designations"
              />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-[11.5px] text-slate-400">{filteredDesignations.length} designations</span>
                {designationSearch ? (
                  <Button variant="ghost" size="sm" onClick={() => setDesignationSearch('')}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" onClick={() => setDesignationDialog({ open: true, designation: null })}>
                    <Plus />
                    Add designation
                  </Button>
                ) : null}
              </div>
            </div>
            <DataTable
              columns={designationColumns}
              data={filteredDesignations}
              rowKey={(designation) => designation.id}
              isLoading={designationsQuery.isLoading}
              isError={designationsQuery.isError}
              onRetry={() => void designationsQuery.refetch()}
              emptyTitle={designationSearch ? 'No designations match this search' : 'No designations yet'}
              emptyDescription={
                designationSearch
                  ? 'Try a different title, department, level or grade.'
                  : 'Create a designation to map employees to the job architecture.'
              }
              emptyAction={
                designationSearch ? (
                  <Button variant="outline" size="sm" onClick={() => setDesignationSearch('')}>
                    <FilterX />
                    Clear search
                  </Button>
                ) : canEdit ? (
                  <Button size="sm" onClick={() => setDesignationDialog({ open: true, designation: null })}>
                    <Plus />
                    Add designation
                  </Button>
                ) : undefined
              }
              skeletonRows={8}
            />
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
              <SearchBox
                value={branchSearch}
                onChange={setBranchSearch}
                placeholder="Search by branch, city, state or head…"
                label="Search branches"
              />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-[11.5px] text-slate-400">{filteredBranches.length} branches</span>
                {branchSearch ? (
                  <Button variant="ghost" size="sm" onClick={() => setBranchSearch('')}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" onClick={() => setBranchDialog({ open: true, branch: null })}>
                    <Plus />
                    Add branch
                  </Button>
                ) : null}
              </div>
            </div>
            <DataTable
              columns={branchColumns}
              data={filteredBranches}
              rowKey={(branch) => branch.id}
              isLoading={branchesQuery.isLoading}
              isError={branchesQuery.isError}
              onRetry={() => void branchesQuery.refetch()}
              emptyTitle={branchSearch ? 'No branches match this search' : 'No branches yet'}
              emptyDescription={
                branchSearch
                  ? 'Try a different branch name, city, state or head.'
                  : 'Create the first branch to define where teams are based.'
              }
              emptyAction={
                branchSearch ? (
                  <Button variant="outline" size="sm" onClick={() => setBranchSearch('')}>
                    <FilterX />
                    Clear search
                  </Button>
                ) : canEdit ? (
                  <Button size="sm" onClick={() => setBranchDialog({ open: true, branch: null })}>
                    <Plus />
                    Add branch
                  </Button>
                ) : undefined
              }
              skeletonRows={5}
            />
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Reporting lines</CardTitle>
                <CardDescription>
                  Managers with direct reports in the current organization snapshot.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportingLinesQuery.isLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-7 w-40 rounded-full" />
                    ))}
                  </div>
                ) : reportingLinesQuery.isError ? (
                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                    Reporting line details could not be loaded.
                    <Button variant="outline" size="sm" onClick={() => void reportingLinesQuery.refetch()}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] text-slate-500">
                      {reportingManagers.length} managers · {totalReportingLines} reporting relationships
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {reportingManagers.length === 0 ? (
                        <span className="text-[12px] text-slate-400">No reporting lines recorded.</span>
                      ) : (
                        reportingManagers.map(({ manager, reports }) => (
                          <Badge key={manager.id} variant="outline" className="gap-1.5">
                            {manager.firstName} {manager.lastName}
                            <span className="text-slate-400">{reports.length}</span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                    <Network className="size-4" />
                  </span>
                  <div>
                    <CardTitle>Organization chart</CardTitle>
                    <CardDescription>
                      Click any card to open the employee profile. Use the toggle below a card to collapse or
                      expand its reporting team.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {orgChartQuery.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Skeleton className="h-40 w-64 rounded-xl" />
                  </div>
                ) : orgChartQuery.isError ? (
                  <ErrorState onRetry={() => void orgChartQuery.refetch()} />
                ) : orgChartQuery.data ? (
                  <OrgChart root={orgChartQuery.data} />
                ) : (
                  <EmptyState
                    icon={Network}
                    title="No organization chart available"
                    description="No active employee is currently set as the top of the reporting hierarchy."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <DepartmentDialog
        open={departmentDialog.open}
        onOpenChange={(open) => setDepartmentDialog((current) => ({ ...current, open }))}
        department={departmentDialog.department}
      />
      <DesignationDialog
        open={designationDialog.open}
        onOpenChange={(open) => setDesignationDialog((current) => ({ ...current, open }))}
        designation={designationDialog.designation}
      />
      <BranchDialog
        open={branchDialog.open}
        onOpenChange={(open) => setBranchDialog((current) => ({ ...current, open }))}
        branch={branchDialog.branch}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete this ${deleteTarget?.kind ?? 'record'}?`}
        description={
          deleteTarget ? (
            <>
              <span className="font-medium text-slate-700">{deleteLabel}</span> will be removed from the
              organization. The service will block deletion if employees or open roles still depend on it.
            </>
          ) : null
        }
        confirmLabel={`Delete ${deleteTarget?.kind ?? 'record'}`}
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync(deleteTarget).catch(() => undefined)
        }}
      />
    </div>
  )
}
