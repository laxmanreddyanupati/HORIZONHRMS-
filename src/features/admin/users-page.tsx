import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FilterX,
  Mail,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useRole } from '@/contexts/role-context'
import { getEmployeeName } from '@/data/employees'
import { roleMatrix } from '@/data/users'
import { fetchSystemUsers, inviteUser, updateSystemUser, updateSystemUserMfa } from '@/services'
import { ROLES } from '@/lib/constants'
import { formatDateTime, initials } from '@/lib/utils'
import type { SystemUser } from '@/types'
import { ChangeRoleDialog, InviteUserDialog } from './user-dialogs'

function roleLabel(role: SystemUser['role']) {
  return ROLES.find((option) => option.value === role)?.label ?? role
}

function PermissionBadge({ value }: { value: string }) {
  const variant =
    value === 'Full'
      ? 'success'
      : value === 'None'
        ? 'secondary'
        : value === 'View' || value === 'Team view' || value === 'Payroll view' || value === 'Self'
          ? 'outline'
          : 'info'
  return <Badge variant={variant}>{value}</Badge>
}

const MATRIX_COLUMNS: Array<{
  key: 'superAdmin' | 'hrAdmin' | 'hrExecutive' | 'manager' | 'payrollAdmin' | 'employee'
  label: string
}> = [
  { key: 'superAdmin', label: 'Super Admin' },
  { key: 'hrAdmin', label: 'HR Admin' },
  { key: 'hrExecutive', label: 'HR Executive' },
  { key: 'manager', label: 'Manager' },
  { key: 'payrollAdmin', label: 'Payroll Admin' },
  { key: 'employee', label: 'Employee' },
]

export function UsersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { role } = useRole()
  const canInvite = role === 'super-admin' || role === 'hr-admin'
  const canManage = role === 'super-admin'

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<SystemUser | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<SystemUser | null>(null)

  const usersQuery = useQuery({ queryKey: ['system-users'], queryFn: fetchSystemUsers })
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch =
        query.length === 0 ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.employeeId ?? '').toLowerCase().includes(query) ||
        getEmployeeName(user.employeeId).toLowerCase().includes(query)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize)

  const counts = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === 'Active').length,
      invited: users.filter((user) => user.status === 'Invited').length,
      suspended: users.filter((user) => user.status === 'Suspended').length,
    }),
    [users],
  )

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (user) => {
      toast.success('Invitation created', {
        description: `${user.email} was added with the ${roleLabel(user.role)} role. No email was sent.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
    onError: (error: Error) => toast.error('Could not create the invitation', { description: error.message }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, nextRole }: { id: string; nextRole: SystemUser['role'] }) =>
      updateSystemUser(id, { role: nextRole }),
    onSuccess: (user) => {
      toast.success('User role updated', {
        description: `${user.name} is now ${roleLabel(user.role)}.`,
      })
      setRoleTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
    onError: (error: Error) => toast.error('Could not change the user role', { description: error.message }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: SystemUser['status'] }) =>
      updateSystemUser(id, { status: nextStatus }),
    onSuccess: (user) => {
      const title =
        user.status === 'Suspended'
          ? 'User suspended'
          : user.status === 'Active'
            ? 'User reactivated'
            : 'User status updated'
      toast.success(title, {
        description: `${user.name} is now ${user.status}.`,
      })
      setSuspendTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
    onError: (error: Error) => toast.error('Could not update the user status', { description: error.message }),
  })

  const mfaMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateSystemUserMfa(id, enabled),
    onSuccess: (user) => {
      toast.success(`MFA ${user.mfaEnabled ? 'enabled' : 'disabled'}`, {
        description: `${user.name} · MFA setting saved.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
    onError: (error: Error) => toast.error('Could not update MFA', { description: error.message }),
  })

  const resetFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const hasFilters = search !== '' || roleFilter !== 'all' || statusFilter !== 'all'

  const columns: Array<DataTableColumn<SystemUser>> = [
    {
      key: 'user',
      header: 'User',
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-semibold text-primary-700">
            {initials(user.name.split(' ')[0] ?? user.name, user.name.split(' ')[1] ?? '')}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-700">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'employee',
      header: 'Linked employee',
      cell: (user) =>
        user.employeeId ? (
          <div className="max-w-44">
            <p className="truncate text-slate-700">{getEmployeeName(user.employeeId)}</p>
            <p className="font-mono text-[10.5px] text-slate-400">{user.employeeId}</p>
          </div>
        ) : (
          <span className="text-[12px] text-slate-400">Not linked</span>
        ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => (
        <Badge variant={user.role === 'super-admin' ? 'purple' : 'outline'}>{roleLabel(user.role)}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: 'lastActive',
      header: 'Last active',
      cell: (user) => (
        <span className="text-[12px] text-slate-500">{formatDateTime(user.lastActive)}</span>
      ),
    },
    {
      key: 'mfa',
      header: 'MFA',
      cell: (user) => {
        const pending = mfaMutation.isPending && mfaMutation.variables?.id === user.id
        return (
          <div title={canManage ? undefined : 'Only Super Admin can manage MFA'}>
            <Switch
              checked={user.mfaEnabled}
              onCheckedChange={(checked) => mfaMutation.mutate({ id: user.id, enabled: checked })}
              disabled={!canManage || pending}
              aria-label={`Multi-factor authentication for ${user.name}`}
            />
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (user) => {
        if (!canManage) {
          return <span className="text-[11px] text-slate-400">View only</span>
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setRoleTarget(user)}>
                <ShieldCheck />
                Change role
              </DropdownMenuItem>
              {user.employeeId ? (
                <DropdownMenuItem onClick={() => navigate(`/employees/${user.employeeId}`)}>
                  <Users />
                  View employee profile
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              {user.status === 'Suspended' ? (
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate({ id: user.id, nextStatus: 'Active' })}
                  disabled={statusMutation.isPending}
                >
                  <UserCheck />
                  Reactivate user
                </DropdownMenuItem>
              ) : user.status === 'Invited' ? (
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate({ id: user.id, nextStatus: 'Active' })}
                  disabled={statusMutation.isPending}
                >
                  <UserCheck />
                  Activate user
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setSuspendTarget(user)}
                  disabled={statusMutation.isPending}
                >
                  <UserX />
                  Suspend user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const matrixColumns: Array<DataTableColumn<(typeof roleMatrix)[number]>> = [
    {
      key: 'module',
      header: 'Module',
      cell: (row) => <span className="font-medium text-slate-700">{row.module}</span>,
    },
    ...MATRIX_COLUMNS.map((column) => ({
      key: column.key,
      header: column.label,
      cell: (row: (typeof roleMatrix)[number]) => <PermissionBadge value={row[column.key]} />,
    })),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="System identities, role assignments and security settings."
        actions={
          canInvite ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite user
            </Button>
          ) : null
        }
      />

      <DemoNotice>
        User accounts, role assignments and MFA settings are stored by the HRMS API. Invitations do not send email in
        this deployment.
      </DemoNotice>

      {!canManage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-amber-900">
          <span className="font-semibold">HR Admin view.</span> You can invite new users, but role changes, suspension
          and MFA management are restricted to the Super Admin role.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total identities" value={counts.total} icon={Users} />
        <StatCard label="Active" value={counts.active} icon={UserCheck} />
        <StatCard label="Invited" value={counts.invited} icon={Mail} />
        <StatCard label="Suspended" value={counts.suspended} icon={UserX} />
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
              placeholder="Search by name, email, employee ID or linked employee…"
              className="pl-9"
              aria-label="Search system users"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Invited">Invited</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
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
          rowKey={(user) => user.id}
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          onRetry={() => void usersQuery.refetch()}
          emptyTitle={hasFilters ? 'No users match these filters' : 'No system users yet'}
          emptyDescription={
            hasFilters
              ? 'Try a different search term or clear one of the filters.'
              : 'Invite a user to start building the identity list.'
          }
          emptyAction={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <FilterX />
                Clear filters
              </Button>
            ) : canInvite ? (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus />
                Invite user
              </Button>
            ) : undefined
          }
          footer={
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
              itemLabel="identities"
            />
          }
          skeletonRows={6}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role matrix</CardTitle>
          <p className="text-[12px] leading-relaxed text-slate-500">
            Read-only reference for role permissions. User Management is limited to Super Admin and HR Admin, with HR
            Admin able to invite users only.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable columns={matrixColumns} data={roleMatrix} rowKey={(row) => row.module} skeletonRows={4} />
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        existingEmails={users.map((user) => user.email)}
        onSubmit={async (input) => {
          await inviteMutation.mutateAsync(input)
        }}
      />

      <ChangeRoleDialog
        open={Boolean(roleTarget)}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        user={roleTarget}
        onSubmit={async (nextRole) => {
          if (!roleTarget) return
          await roleMutation.mutateAsync({ id: roleTarget.id, nextRole })
        }}
      />

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="Suspend this user?"
        description={
          suspendTarget ? (
            <>
              <span className="font-medium text-slate-700">{suspendTarget.name}</span> ({suspendTarget.email}) will be
              suspended. They will no longer appear as an active identity, and their MFA setting remains unchanged.
            </>
          ) : null
        }
        confirmLabel="Suspend user"
        destructive
        onConfirm={async () => {
          if (!suspendTarget) return
          try {
            await statusMutation.mutateAsync({ id: suspendTarget.id, nextStatus: 'Suspended' })
          } catch {
            // The parent mutation surfaces the error toast.
          }
        }}
      />
    </div>
  )
}
