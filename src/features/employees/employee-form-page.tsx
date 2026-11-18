import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type Control, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ArrowLeft, Loader2, Plus, Save, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/contexts/role-context'
import { BranchDialog, DepartmentDialog, DesignationDialog } from '@/features/organization/organization-dialogs'
import { loadAllEmployees } from '@/lib/reference-data'
import {
  createEmployee,
  fetchBranchStats,
  fetchDepartmentStats,
  fetchDesignationStats,
  fetchEmployee,
  updateEmployee,
} from '@/services'
import { EMPLOYEE_EDIT_ROLES } from '@/lib/constants'
import type { EmployeeFormInput } from '@/types'
import { getWorkspaceDate } from '@/lib/utils'

const schema = z.object({
  firstName: z.string().trim().min(2, 'Enter at least two characters.'),
  lastName: z.string().trim().min(2, 'Enter at least two characters.'),
  email: z.string().trim().email('Enter a valid work email address.'),
  personalEmail: z.string().trim().email('Enter a valid personal email address.'),
  phone: z.string().trim().min(10, 'Enter a valid phone number.'),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z.string().min(1, 'Select a date of birth.'),
  maritalStatus: z.enum(['Single', 'Married']),
  bloodGroup: z.string().trim().min(1, 'Select a blood group.'),
  departmentId: z.string().min(1, 'Select a department.'),
  designationId: z.string().min(1, 'Select a designation.'),
  branchId: z.string().min(1, 'Select a branch.'),
  managerId: z.string().nullable().optional(),
  employmentType: z.enum(['Full-time', 'Contract', 'Internship']),
  status: z.enum(['Active', 'Probation', 'On Leave', 'Inactive']),
  dateOfJoining: z.string().min(1, 'Select a joining date.'),
  workLocation: z.string().trim().min(1, 'Enter a work location.'),
  address: z.object({
    line1: z.string().trim().min(3, 'Enter a street address.'),
    city: z.string().trim().min(2, 'Enter a city.'),
    state: z.string().trim().min(2, 'Enter a state.'),
    postalCode: z.string().trim().regex(/^\d{5,6}$/, 'Enter a valid postal code.'),
    country: z.string().trim().min(2, 'Enter a country.'),
  }),
  emergencyContactName: z.string().trim().min(2, 'Enter a contact name.'),
  emergencyContactRelationship: z.string().trim().min(2, 'Enter a relationship.'),
  emergencyContactPhone: z.string().trim().min(10, 'Enter a valid phone number.'),
})

type FormValues = z.infer<typeof schema>

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const emptyValues: FormValues = {
  firstName: '',
  lastName: '',
  email: '',
  personalEmail: '',
  phone: '',
  gender: 'Female',
  dateOfBirth: '',
  maritalStatus: 'Single',
  bloodGroup: 'O+',
  departmentId: '',
  designationId: '',
  branchId: '',
  managerId: null,
  employmentType: 'Full-time',
  status: 'Probation',
  dateOfJoining: getWorkspaceDate(),
  workLocation: '',
  address: { line1: '', city: '', state: '', postalCode: '', country: 'India' },
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
}

function FormSelect({
  name,
  control,
  options,
  placeholder,
  allowNone,
  disabled,
  onChange,
  emptyAction,
}: {
  name: Path<FormValues>
  control: Control<FormValues>
  options: Array<{ value: string; label: string }>
  placeholder: string
  allowNone?: boolean
  disabled?: boolean
  onChange?: (value: string) => void
  emptyAction?: { label: string; onClick: () => void }
}) {
  if (!options.length && emptyAction) {
    return (
      <Button type="button" variant="outline" className="w-full justify-start" onClick={emptyAction.onClick}>
        <Plus />
        {emptyAction.label}
      </Button>
    )
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={(field.value as string | null) ?? (allowNone ? 'none' : '')}
          disabled={disabled}
          onValueChange={(value) => {
            field.onChange(value === 'none' ? null : value)
            onChange?.(value)
          }}
        >
          <SelectTrigger aria-label={placeholder}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowNone ? <SelectItem value="none">No manager</SelectItem> : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}

export function EmployeeFormPage() {
  const { employeeId } = useParams()
  const isEdit = Boolean(employeeId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { role } = useRole()
  const canEdit = EMPLOYEE_EDIT_ROLES.includes(role)
  const [setupDialog, setSetupDialog] = useState<'department' | 'designation' | 'branch' | null>(null)

  const employeeQuery = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployee(employeeId as string),
    enabled: isEdit,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  })

  const departmentsQuery = useQuery({
    queryKey: ['organization-departments'],
    queryFn: fetchDepartmentStats,
    enabled: canEdit,
  })
  const designationsQuery = useQuery({
    queryKey: ['organization-designations'],
    queryFn: fetchDesignationStats,
    enabled: canEdit,
  })
  const branchesQuery = useQuery({
    queryKey: ['organization-branches'],
    queryFn: fetchBranchStats,
    enabled: canEdit,
  })
  const managersQuery = useQuery({
    queryKey: ['employees', 'manager-options'],
    queryFn: loadAllEmployees,
    enabled: canEdit,
  })

  useEffect(() => {
    const employee = employeeQuery.data
    if (!employee) return
    form.reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      personalEmail: employee.personalEmail,
      phone: employee.phone,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth,
      maritalStatus: employee.maritalStatus,
      bloodGroup: employee.bloodGroup,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      branchId: employee.branchId,
      managerId: employee.managerId,
      employmentType: employee.employmentType,
      status: employee.status,
      dateOfJoining: employee.dateOfJoining,
      workLocation: employee.workLocation,
      address: employee.address,
      emergencyContactName: employee.emergencyContacts[0]?.name ?? '',
      emergencyContactRelationship: employee.emergencyContacts[0]?.relationship ?? '',
      emergencyContactPhone: employee.emergencyContacts[0]?.phone ?? '',
    })
  }, [employeeQuery.data, form])

  const mutation = useMutation({
    mutationFn: (values: EmployeeFormInput) =>
      employeeId ? updateEmployee(employeeId, values) : createEmployee(values),
    onSuccess: (employee) => {
      toast.success(isEdit ? 'Employee updated' : 'Employee added', {
        description: `${employee.firstName} ${employee.lastName} (${employee.id}) was saved to the employee directory.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['employee-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['employee', employee.id] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate(`/employees/${employee.id}`)
    },
    onError: (error: Error) => {
      const apiError = error as { errors?: Record<string, string[]> }
      if (apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          form.setError(field as keyof FormValues, { message: messages[0] })
        })
      }
      toast.error('Could not save the employee', { description: error.message })
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values)
  })

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-20 text-center shadow-card">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">Employee editing is restricted</h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          The {role} role can view the directory but cannot add or edit employee records. This is enforced by the API.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/employees">
            <ArrowLeft />
            Back to employees
          </Link>
        </Button>
      </div>
    )
  }

  if (isEdit && employeeQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeader title="Edit employee" description="The requested employee could not be loaded." />
        <ErrorState title="Employee not found" onRetry={() => void employeeQuery.refetch()} />
        <Button asChild variant="outline">
          <Link to="/employees">
            <ArrowLeft />
            Back to employees
          </Link>
        </Button>
      </div>
    )
  }

  if (isEdit && employeeQuery.isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Edit employee" description="Loading the employee record…" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    )
  }

  const departmentId = form.watch('departmentId')
  const currentManagerId = form.watch('managerId')
  const departments = departmentsQuery.data ?? []
  const designations = designationsQuery.data ?? []
  const branches = branchesQuery.data ?? []
  const departmentDesignations = designations.filter((designation) => designation.departmentId === departmentId)
  const managerOptions = (managersQuery.data ?? [])
    .filter((employee) => employee.id !== employeeId && (employee.status !== 'Inactive' || employee.id === currentManagerId))
    .map((employee) => ({
      value: employee.id,
      label: `${employee.firstName} ${employee.lastName} · ${employee.id}`,
    }))

  const organizationQueries = [departmentsQuery, designationsQuery, branchesQuery]
  const organizationError = organizationQueries.some((query) => query.isError)
  const organizationLoading = organizationQueries.some((query) => query.isPending)
  const canSave = !mutation.isPending && !organizationLoading && !organizationError
    && departments.length > 0 && designations.length > 0 && branches.length > 0
  const closeSetup = (open: boolean) => {
    if (!open) setSetupDialog(null)
  }

  return (
    <div>
    <form onSubmit={onSubmit} className="space-y-5">
      <PageHeader
        eyebrow={isEdit ? 'Employee record' : 'Onboarding'}
        title={isEdit ? 'Edit employee' : 'Add employee'}
        description={
          isEdit
            ? 'Update personal, employment and emergency contact details. Changes are saved to the HRMS database.'
            : 'Create an employee record. Validation mirrors a typical HR onboarding form.'
        }
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link to={employeeId ? `/employees/${employeeId}` : '/employees'}>
                <ArrowLeft />
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={!canSave}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {isEdit ? 'Save changes' : 'Create employee'}
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-[11.5px] leading-relaxed text-amber-800">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Employee records are stored by the HRMS API. Avoid entering real bank or identity information unless this
          deployment is approved for production personal data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="First name" htmlFor="firstName" required error={form.formState.errors.firstName?.message}>
            <Input id="firstName" placeholder="e.g. Ananya" {...form.register('firstName')} />
          </FormField>
          <FormField label="Last name" htmlFor="lastName" required error={form.formState.errors.lastName?.message}>
            <Input id="lastName" placeholder="e.g. Deshpande" {...form.register('lastName')} />
          </FormField>
          <FormField label="Work email" htmlFor="email" required error={form.formState.errors.email?.message}>
            <Input id="email" type="email" placeholder="name@horizontech.example" {...form.register('email')} />
          </FormField>
          <FormField
            label="Personal email"
            htmlFor="personalEmail"
            required
            error={form.formState.errors.personalEmail?.message}
          >
            <Input id="personalEmail" type="email" placeholder="name@example.com" {...form.register('personalEmail')} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" required error={form.formState.errors.phone?.message}>
            <Input id="phone" placeholder="+91 98490 00000" {...form.register('phone')} />
          </FormField>
          <FormField label="Gender" required error={form.formState.errors.gender?.message}>
            <FormSelect
              name="gender"
              control={form.control}
              placeholder="Select gender"
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </FormField>
          <FormField
            label="Date of birth"
            htmlFor="dateOfBirth"
            required
            error={form.formState.errors.dateOfBirth?.message}
          >
            <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
          </FormField>
          <FormField label="Marital status" required error={form.formState.errors.maritalStatus?.message}>
            <FormSelect
              name="maritalStatus"
              control={form.control}
              placeholder="Select status"
              options={[
                { value: 'Single', label: 'Single' },
                { value: 'Married', label: 'Married' },
              ]}
            />
          </FormField>
          <FormField label="Blood group" required error={form.formState.errors.bloodGroup?.message}>
            <FormSelect
              name="bloodGroup"
              control={form.control}
              placeholder="Select blood group"
              options={BLOOD_GROUPS.map((group) => ({ value: group, label: group }))}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizationError && (
            <div className="md:col-span-2 xl:col-span-3">
              <ErrorState
                title="Employment options could not be loaded"
                onRetry={() => organizationQueries.forEach((query) => void query.refetch())}
              />
            </div>
          )}
          <FormField label="Department" required error={form.formState.errors.departmentId?.message}>
            <FormSelect
              name="departmentId"
              control={form.control}
              placeholder={departmentsQuery.isPending ? 'Loading departments…' : 'Select department'}
              disabled={!departments.length}
              options={departments.map((department) => ({ value: department.id, label: department.name }))}
              emptyAction={departmentsQuery.isSuccess ? {
                label: 'Create a department',
                onClick: () => setSetupDialog('department'),
              } : undefined}
              onChange={(value) => form.setValue(
                'designationId',
                designations.find((designation) => designation.departmentId === value)?.id ?? '',
                { shouldDirty: true, shouldValidate: true },
              )}
            />
          </FormField>
          <FormField label="Designation" required error={form.formState.errors.designationId?.message}>
            <FormSelect
              name="designationId"
              control={form.control}
              placeholder="Select designation"
              disabled={!departmentDesignations.length}
              options={departmentDesignations
                .map((designation) => ({ value: designation.id, label: designation.title }))}
              emptyAction={departmentsQuery.isSuccess && designationsQuery.isSuccess ? {
                label: departments.length ? 'Create a designation' : 'Create a department first',
                onClick: () => setSetupDialog(departments.length ? 'designation' : 'department'),
              } : undefined}
            />
            {departmentDesignations.length > 0 && (
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => setSetupDialog('designation')}>
                Add another designation
              </Button>
            )}
          </FormField>
          <FormField label="Branch" required error={form.formState.errors.branchId?.message}>
            <FormSelect
              name="branchId"
              control={form.control}
              placeholder={branchesQuery.isPending ? 'Loading branches…' : 'Select branch'}
              disabled={!branches.length}
              options={branches.map((branch) => ({ value: branch.id, label: `${branch.name}, ${branch.city}` }))}
              emptyAction={branchesQuery.isSuccess ? {
                label: 'Create a branch',
                onClick: () => setSetupDialog('branch'),
              } : undefined}
            />
          </FormField>
          <FormField label="Reporting manager" error={form.formState.errors.managerId?.message}>
            <FormSelect
              name="managerId"
              control={form.control}
              placeholder="Select manager"
              options={managerOptions}
              disabled={managersQuery.isPending || managersQuery.isError}
              allowNone
            />
            {managersQuery.isSuccess && !managerOptions.length && (
              <p className="text-xs text-muted-foreground">Managers can be assigned once an eligible employee exists.</p>
            )}
            {managersQuery.isError && (
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => void managersQuery.refetch()}>
                Retry loading managers
              </Button>
            )}
          </FormField>
          <FormField label="Employment type" required error={form.formState.errors.employmentType?.message}>
            <FormSelect
              name="employmentType"
              control={form.control}
              placeholder="Select type"
              options={[
                { value: 'Full-time', label: 'Full-time' },
                { value: 'Contract', label: 'Contract' },
                { value: 'Internship', label: 'Internship' },
              ]}
            />
          </FormField>
          <FormField label="Employment status" required error={form.formState.errors.status?.message}>
            <FormSelect
              name="status"
              control={form.control}
              placeholder="Select status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Probation', label: 'Probation' },
                { value: 'On Leave', label: 'On Leave' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </FormField>
          <FormField
            label="Date of joining"
            htmlFor="dateOfJoining"
            required
            error={form.formState.errors.dateOfJoining?.message}
          >
            <Input id="dateOfJoining" type="date" {...form.register('dateOfJoining')} />
          </FormField>
          <FormField
            label="Work location"
            htmlFor="workLocation"
            required
            error={form.formState.errors.workLocation?.message}
          >
            <Input id="workLocation" placeholder="Hyderabad HQ" {...form.register('workLocation')} />
          </FormField>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Street address"
              htmlFor="addressLine1"
              required
              className="sm:col-span-2"
              error={form.formState.errors.address?.line1?.message}
            >
              <Input id="addressLine1" placeholder="Flat, street, area" {...form.register('address.line1')} />
            </FormField>
            <FormField label="City" htmlFor="city" required error={form.formState.errors.address?.city?.message}>
              <Input id="city" {...form.register('address.city')} />
            </FormField>
            <FormField label="State" htmlFor="state" required error={form.formState.errors.address?.state?.message}>
              <Input id="state" {...form.register('address.state')} />
            </FormField>
            <FormField
              label="Postal code"
              htmlFor="postalCode"
              required
              error={form.formState.errors.address?.postalCode?.message}
            >
              <Input id="postalCode" inputMode="numeric" {...form.register('address.postalCode')} />
            </FormField>
            <FormField
              label="Country"
              htmlFor="country"
              required
              error={form.formState.errors.address?.country?.message}
            >
              <Input id="country" {...form.register('address.country')} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Contact name"
              htmlFor="emergencyContactName"
              required
              className="sm:col-span-2"
              error={form.formState.errors.emergencyContactName?.message}
            >
              <Input id="emergencyContactName" placeholder="Full name" {...form.register('emergencyContactName')} />
            </FormField>
            <FormField
              label="Relationship"
              htmlFor="emergencyContactRelationship"
              required
              error={form.formState.errors.emergencyContactRelationship?.message}
            >
              <Input
                id="emergencyContactRelationship"
                placeholder="Spouse, parent, sibling…"
                {...form.register('emergencyContactRelationship')}
              />
            </FormField>
            <FormField
              label="Contact phone"
              htmlFor="emergencyContactPhone"
              required
              error={form.formState.errors.emergencyContactPhone?.message}
            >
              <Input
                id="emergencyContactPhone"
                placeholder="+91 98490 00000"
                {...form.register('emergencyContactPhone')}
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link to={employeeId ? `/employees/${employeeId}` : '/employees'}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={!canSave}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          {isEdit ? 'Save changes' : 'Create employee'}
        </Button>
      </div>
    </form>
    <DepartmentDialog
      open={setupDialog === 'department'}
      onOpenChange={closeSetup}
      department={null}
      onSaved={(department) => {
        form.setValue('departmentId', department.id, { shouldDirty: true, shouldValidate: true })
        form.setValue('designationId', '', { shouldDirty: true })
      }}
    />
    <DesignationDialog
      open={setupDialog === 'designation'}
      onOpenChange={closeSetup}
      designation={null}
      defaultDepartmentId={departmentId || (departments.length === 1 ? departments[0].id : undefined)}
      onSaved={(designation) => {
        form.setValue('departmentId', designation.departmentId, { shouldDirty: true, shouldValidate: true })
        form.setValue('designationId', designation.id, { shouldDirty: true, shouldValidate: true })
      }}
    />
    <BranchDialog
      open={setupDialog === 'branch'}
      onOpenChange={closeSetup}
      branch={null}
      onSaved={(branch) => form.setValue('branchId', branch.id, { shouldDirty: true, shouldValidate: true })}
    />
    </div>
  )
}
