import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  FileText,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { AvatarName } from '@/components/common/avatar-name'
import { DemoNotice } from '@/components/common/demo-notice'
import { DetailItem, DetailList } from '@/components/common/detail-list'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { SensitiveValue } from '@/components/common/sensitive-value'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/contexts/role-context'
import { getBranchName, getDepartmentName } from '@/data/organization'
import { getDesignationTitle } from '@/data/designations'
import { getEmployeeName } from '@/data/employees'
import { fetchEmployee } from '@/services'
import { EMPLOYEE_EDIT_ROLES, MODULE_ACCESS, ROLES, type ModuleKey } from '@/lib/constants'
import { calculateTenure, formatDate } from '@/lib/utils'
import type { Employee, Role } from '@/types'

interface QuickLink {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

const SELF_SERVICE_LINKS: QuickLink[] = [
  { label: 'Attendance', description: 'Clock-ins, corrections and monthly view', href: '/attendance', icon: CalendarCheck2 },
  { label: 'Leave', description: 'Balances, requests and approvals', href: '/leave', icon: CalendarDays },
  { label: 'Payroll', description: 'Payslips and compensation details', href: '/payroll', icon: Wallet },
  { label: 'Performance', description: 'Goals, reviews and feedback', href: '/performance', icon: Target },
  { label: 'Expenses', description: 'Claims and reimbursement status', href: '/expenses', icon: ReceiptText },
]

const ADMIN_LINKS: QuickLink[] = [
  { label: 'Settings', description: 'Workspace and payroll configuration', href: '/settings', icon: Settings },
  { label: 'User management', description: 'Accounts and roles', href: '/users', icon: ShieldCheck },
  { label: 'Audit logs', description: 'Read-only administrative activity', href: '/audit-logs', icon: ScrollText },
  { label: 'Employee directory', description: 'Browse employee records', href: '/employees', icon: Users },
]

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  organization: 'Organization',
  recruitment: 'Recruitment',
  performance: 'Performance',
  attendance: 'Attendance',
  leave: 'Leave',
  payroll: 'Payroll',
  expenses: 'Expenses',
  reports: 'Reports',
  settings: 'Settings',
  users: 'User Management',
  audit: 'Audit Logs',
  profile: 'My Profile',
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/)
  return {
    first: parts[0] ?? name,
    last: parts.slice(1).join(' '),
  }
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function QuickLinksCard({ title, links }: { title: string; links: QuickLink[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="group flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary-50/40"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary">
                <link.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-slate-700">{link.label}</span>
                <span className="mt-0.5 block text-[10.5px] leading-relaxed text-slate-400">{link.description}</span>
              </span>
            </span>
            <ArrowRight className="mt-1 size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  const { role, roleLabel, persona, canViewSensitive } = useRole()
  const canEdit = EMPLOYEE_EDIT_ROLES.includes(role)

  const employeeQuery = useQuery({
    queryKey: ['employee', persona.employeeId],
    queryFn: () => fetchEmployee(persona.employeeId as string),
    enabled: Boolean(persona.employeeId),
  })

  if (!persona.employeeId) {
    return (
      <AccountOnlyProfile
        name={persona.name}
        email={persona.email}
        title={persona.title}
        role={role}
        roleLabel={roleLabel}
      />
    )
  }

  if (employeeQuery.isLoading) {
    return <ProfileSkeleton />
  }

  if (employeeQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow={`My profile · ${roleLabel}`}
          title={persona.name}
          description="The employee record linked to this account could not be loaded."
        />
        <ErrorState title="Profile unavailable" onRetry={() => void employeeQuery.refetch()} />
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  if (!employeeQuery.data) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={`My profile · ${roleLabel}`} title={persona.name} />
        <Card>
          <CardContent>
            <EmptyState
              title="No employee record linked"
              description="This account does not have a linked employee profile."
              action={
                <Button variant="outline" asChild>
                  <Link to="/employees">Open employee directory</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <EmployeeSelfProfile
      employee={employeeQuery.data}
      roleLabel={roleLabel}
      canViewSensitive={canViewSensitive}
      canEdit={canEdit}
      personaEmail={persona.email}
    />
  )
}

function EmployeeSelfProfile({
  employee,
  roleLabel,
  canViewSensitive,
  canEdit,
  personaEmail,
}: {
  employee: Employee
  roleLabel: string
  canViewSensitive: boolean
  canEdit: boolean
  personaEmail: string
}) {
  const fullName = `${employee.firstName} ${employee.lastName}`
  const latestDocument = [...employee.documents].sort((a, b) => b.uploadedOn.localeCompare(a.uploadedOn))[0]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`My profile · ${roleLabel}`}
        title={fullName}
        description={`${getDesignationTitle(employee.designationId)} · ${getDepartmentName(employee.departmentId)} · ${getBranchName(employee.branchId)}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/employees/${employee.id}`}>
                <IdCard />
                Full employee record
              </Link>
            </Button>
            {canEdit ? (
              <Button asChild>
                <Link to={`/employees/${employee.id}/edit`}>
                  <Pencil />
                  Edit details
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <DemoNotice>
        This self-service profile belongs to the signed-in {roleLabel} account ({personaEmail}). Changes are saved
        through the HRMS API.
      </DemoNotice>

      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-linear-to-r from-primary via-sky-500 to-teal-400" />
        <CardContent className="flex flex-col gap-5 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <AvatarName firstName={employee.firstName} lastName={employee.lastName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{fullName}</h2>
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
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Employee ID</p>
              <p className="mt-0.5 font-mono text-[11.5px] font-medium text-slate-700">{employee.id}</p>
            </div>
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-slate-600">
                {employee.about ?? 'No profile summary has been added for this employee.'}
              </p>
              <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job and employment</CardTitle>
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
                <DetailItem label="Working shift">
                  {employee.shiftId.replace('shift-', '').replace(/-/g, ' ')}
                </DetailItem>
              </DetailList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList className="xl:grid-cols-3">
                <DetailItem label="Date of birth">{formatDate(employee.dateOfBirth)}</DetailItem>
                <DetailItem label="Gender">{employee.gender}</DetailItem>
                <DetailItem label="Marital status">{employee.maritalStatus}</DetailItem>
                <DetailItem label="Blood group">{employee.bloodGroup}</DetailItem>
                <DetailItem label="Personal email">{employee.personalEmail}</DetailItem>
                <DetailItem label="Primary phone">{employee.phone}</DetailItem>
                <DetailItem label="Address" className="sm:col-span-2 xl:col-span-3">
                  {employee.address.line1}, {employee.address.city}, {employee.address.state}{' '}
                  {employee.address.postalCode}, {employee.address.country}
                </DetailItem>
              </DetailList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.emergencyContacts.length === 0 ? (
                <p className="text-[12px] text-slate-400">No emergency contacts recorded.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {employee.emergencyContacts.map((contact) => (
                    <div key={contact.id} className="rounded-lg border border-border p-3.5">
                      <p className="text-[13px] font-medium text-slate-700">{contact.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">{contact.relationship}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-600">
                        <Phone className="size-3.5 text-slate-400" />
                        {contact.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Bank and statutory</CardTitle>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Masked for roles without sensitive-data access.
                </p>
              </div>
              <Landmark className="size-4 text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-5">
              {!canViewSensitive ? (
                <div className="rounded-lg bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                  Bank and statutory identifiers are masked for the {roleLabel} role. Super Admin, HR Admin and Payroll
                  Admin can view them.
                </div>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    Bank account
                  </p>
                  <DetailList className="sm:grid-cols-1">
                    <DetailItem label="Bank name">{employee.bank?.bankName ?? '—'}</DetailItem>
                    <DetailItem label="Account type">{employee.bank?.accountType ?? '—'}</DetailItem>
                    <DetailItem label="Account number">
                      <SensitiveValue value={employee.bank?.accountNumber} visible={canViewSensitive} />
                    </DetailItem>
                    <DetailItem label="IFSC">
                      <SensitiveValue value={employee.bank?.ifsc} visible={canViewSensitive} />
                    </DetailItem>
                    <DetailItem label="Branch">{employee.bank?.branch ?? '—'}</DetailItem>
                  </DetailList>
                </div>
                <div>
                  <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    Statutory identifiers
                  </p>
                  <DetailList className="sm:grid-cols-1">
                    <DetailItem label="PAN">
                      <SensitiveValue value={employee.statutory?.pan} visible={canViewSensitive} />
                    </DetailItem>
                    <DetailItem label="Aadhaar">
                      <SensitiveValue value={employee.statutory?.aadhaar} visible={canViewSensitive} />
                    </DetailItem>
                    <DetailItem label="UAN">
                      <SensitiveValue value={employee.statutory?.uan} visible={canViewSensitive} />
                    </DetailItem>
                    <DetailItem label="PF number">
                      <SensitiveValue value={employee.statutory?.pfNumber} visible={canViewSensitive} />
                    </DetailItem>
                    <DetailItem label="ESI number">
                      <SensitiveValue value={employee.statutory?.esiNumber} visible={canViewSensitive} />
                    </DetailItem>
                  </DetailList>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Session and role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-500">Role</span>
                <Badge>{roleLabel}</Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Account email</p>
                <p className="mt-0.5 break-all text-[12px] font-medium text-slate-700">{personaEmail}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Sensitive data</p>
                <p className="mt-0.5 text-[12px] font-medium text-slate-700">
                  {canViewSensitive ? 'Visible for this role' : 'Masked for this role'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Authentication</p>
                <p className="mt-0.5 text-[12px] font-medium text-slate-700">Authenticated session</p>
              </div>
              <p className="border-t border-border pt-3 text-[10.5px] leading-relaxed text-slate-400">
                Your role is assigned to your account and enforced by the API for every request.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <FileText className="size-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground">{employee.documents.length}</p>
                <p className="text-[12px] text-slate-500">
                  document{employee.documents.length === 1 ? '' : 's'} on file
                </p>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {latestDocument
                  ? `Latest: ${latestDocument.name} · ${formatDate(latestDocument.uploadedOn)}`
                  : 'No document metadata recorded.'}
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                <Link to={`/employees/${employee.id}`}>
                  <IdCard />
                  Open document list
                </Link>
              </Button>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Document metadata is recorded; file storage and upload are not part of this application.
              </p>
            </CardContent>
          </Card>

          <QuickLinksCard title="My quick links" links={SELF_SERVICE_LINKS} />
        </div>
      </div>

      <p className="text-[10.5px] text-slate-400">
        Profile data comes from the HRMS database · Asia/Kolkata (IST).
      </p>
    </div>
  )
}

function AccountOnlyProfile({
  name,
  email,
  title,
  role,
  roleLabel,
}: {
  name: string
  email: string
  title: string
  role: Role
  roleLabel: string
}) {
  const { first, last } = splitName(name)
  const roleDescription = ROLES.find((option) => option.value === role)?.description ?? 'System role.'
  const accessibleModules = (Object.keys(MODULE_ACCESS) as ModuleKey[]).filter((moduleKey) =>
    MODULE_ACCESS[moduleKey].includes(role),
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`My profile · ${roleLabel}`}
        title={name}
        description={`${title} · system account with no linked employee record`}
      />

      <DemoNotice>
        This account is a system account, not an employee. No employee profile, attendance, leave or payroll record is
        linked to it.
      </DemoNotice>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="h-1.5 w-full bg-linear-to-r from-primary via-sky-500 to-teal-400" />
            <CardContent className="pt-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <AvatarName firstName={first} lastName={last} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">{name}</h2>
                      <Badge>{roleLabel}</Badge>
                      <Badge variant="secondary">Authenticated account</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-600">{title}</p>
                    <p className="mt-2 flex items-center gap-1.5 break-all text-[11.5px] text-slate-500">
                      <Mail className="size-3.5 shrink-0" />
                      {email}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/users">
                    <ShieldCheck />
                    User management
                  </Link>
                </Button>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <DetailList className="xl:grid-cols-3">
                  <DetailItem label="Account name">{name}</DetailItem>
                  <DetailItem label="Email">{email}</DetailItem>
                  <DetailItem label="Role">{roleLabel}</DetailItem>
                  <DetailItem label="Linked employee">No employee record linked</DetailItem>
                  <DetailItem label="Account type">System administrator</DetailItem>
                  <DetailItem label="Session">Authenticated session</DetailItem>
                </DetailList>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role capabilities</CardTitle>
              <p className="text-[12px] leading-relaxed text-slate-500">{roleDescription}</p>
            </CardHeader>
            <CardContent>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Accessible modules</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {accessibleModules.map((moduleKey) => (
                  <Badge key={moduleKey} variant="outline">
                    {MODULE_LABELS[moduleKey]}
                  </Badge>
                ))}
              </div>
              <p className="mt-4 text-[10.5px] leading-relaxed text-slate-400">
                Capabilities reflect the configured role matrix and are enforced by the API.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <QuickLinksCard title="Administration shortcuts" links={ADMIN_LINKS} />
          <Card>
            <CardHeader>
              <CardTitle>Account notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[12px] leading-relaxed text-slate-600">
              <p>
                This account is intentionally not linked to an employee record. Attendance, leave, payroll and
                performance self-service screens are unavailable for it.
              </p>
              <p className="text-[11px] text-slate-400">
                Sign in with an HR, Manager or Employee account to view a profile linked to employee data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
