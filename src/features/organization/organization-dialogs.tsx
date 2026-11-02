import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { employees } from '@/data/employees'
import { departments } from '@/data/organization'
import {
  createBranch,
  createDepartment,
  createDesignation,
  updateBranch,
  updateDepartment,
  updateDesignation,
  type DepartmentWithStats,
} from '@/services'
import type { Branch, Designation } from '@/types'

export type DesignationWithCount = Designation & { employeeCount: number }
export type BranchWithCount = Branch & { employeeCount: number }

export function invalidateOrganizationData(queryClient: QueryClient) {
  for (const key of [
    'organization-departments',
    'organization-designations',
    'organization-branches',
    'org-chart',
    'reporting-lines',
    'dashboard',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}

const activeEmployees = employees
  .filter((employee) => employee.status !== 'Inactive')
  .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))

function DialogActions({
  busy,
  submitLabel,
  onCancel,
  children,
}: {
  busy: boolean
  submitLabel: string
  onCancel: () => void
  children?: ReactNode
}) {
  return (
    <DialogFooter>
      {children}
      <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button type="submit" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </DialogFooter>
  )
}

interface DepartmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: DepartmentWithStats | null
}

interface DepartmentFormState {
  name: string
  code: string
  description: string
  headId: string
  location: string
  email: string
}

type DepartmentErrors = Partial<Record<keyof DepartmentFormState, string>>

const emptyDepartmentForm: DepartmentFormState = {
  name: '',
  code: '',
  description: '',
  headId: '',
  location: '',
  email: '',
}

export function DepartmentDialog({ open, onOpenChange, department }: DepartmentDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<DepartmentFormState>(emptyDepartmentForm)
  const [errors, setErrors] = useState<DepartmentErrors>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      department
        ? {
            name: department.name,
            code: department.code,
            description: department.description,
            headId: department.headId,
            location: department.location,
            email: department.email,
          }
        : emptyDepartmentForm,
    )
  }, [open, department])

  const mutation = useMutation({
    mutationFn: (input: DepartmentFormState) =>
      department ? updateDepartment(department.id, input) : createDepartment(input),
    onSuccess: (saved) => {
      toast.success(department ? 'Department updated' : 'Department created', {
        description: `${saved.name} (${saved.code}) is ready in the organization.`,
      })
      invalidateOrganizationData(queryClient)
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error('Could not save the department', { description: error.message }),
  })

  const updateField = (key: keyof DepartmentFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: DepartmentErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Department name is required.'
    if (!form.code.trim()) nextErrors.code = 'Department code is required.'
    if (!form.email.trim()) nextErrors.email = 'Department email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      email: form.email.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit department' : 'Create department'}</DialogTitle>
          <DialogDescription>
            {department
              ? 'Update the department details used across the organization.'
              : 'Add a new department to the organization. It can be linked to employees once saved.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department name" htmlFor="department-name" error={errors.name} required>
              <Input
                id="department-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Data Platform"
              />
            </FormField>
            <FormField label="Code" htmlFor="department-code" error={errors.code} required hint="Short code">
              <Input
                id="department-code"
                value={form.code}
                onChange={(event) => updateField('code', event.target.value.toUpperCase())}
                placeholder="e.g. DATA"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department head" htmlFor="department-head">
              <Select
                value={form.headId || 'none'}
                onValueChange={(value) => updateField('headId', value === 'none' ? '' : value)}
              >
                <SelectTrigger id="department-head">
                  <SelectValue placeholder="Select department head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} · {employee.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Location" htmlFor="department-location">
              <Input
                id="department-location"
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                placeholder="e.g. Hyderabad HQ"
              />
            </FormField>
          </div>
          <FormField label="Department email" htmlFor="department-email" error={errors.email} required>
            <Input
              id="department-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="e.g. data@horizontech.example"
            />
          </FormField>
          <FormField label="Description" htmlFor="department-description">
            <Textarea
              id="department-description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="What does this department own?"
              rows={3}
            />
          </FormField>
          <DialogActions
            busy={mutation.isPending}
            submitLabel={department ? 'Save changes' : 'Create department'}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DesignationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designation: DesignationWithCount | null
}

interface DesignationFormState {
  title: string
  departmentId: string
  level: Designation['level']
  grade: string
}

type DesignationErrors = Partial<Record<'title' | 'departmentId' | 'grade', string>>

export function DesignationDialog({ open, onOpenChange, designation }: DesignationDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<DesignationFormState>({
    title: '',
    departmentId: '',
    level: 'L3',
    grade: '',
  })
  const [errors, setErrors] = useState<DesignationErrors>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      designation
        ? {
            title: designation.title,
            departmentId: designation.departmentId,
            level: designation.level,
            grade: designation.grade,
          }
        : {
            title: '',
            departmentId: departments[0]?.id ?? '',
            level: 'L3',
            grade: '',
          },
    )
  }, [open, designation])

  const mutation = useMutation({
    mutationFn: (input: Omit<Designation, 'id'>) =>
      designation ? updateDesignation(designation.id, input) : createDesignation(input),
    onSuccess: (saved) => {
      toast.success(designation ? 'Designation updated' : 'Designation created', {
        description: `${saved.title} is now part of the job architecture.`,
      })
      invalidateOrganizationData(queryClient)
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error('Could not save the designation', { description: error.message }),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: DesignationErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Designation title is required.'
    if (!form.departmentId) nextErrors.departmentId = 'Select a department.'
    if (!form.grade.trim()) nextErrors.grade = 'Grade is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({
      title: form.title.trim(),
      departmentId: form.departmentId,
      level: form.level,
      grade: form.grade.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{designation ? 'Edit designation' : 'Create designation'}</DialogTitle>
          <DialogDescription>
            Designations map employees to a title, department, level and grade.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Title" htmlFor="designation-title" error={errors.title} required>
            <Input
              id="designation-title"
              value={form.title}
              onChange={(event) => {
                setForm((current) => ({ ...current, title: event.target.value }))
                setErrors((current) => ({ ...current, title: undefined }))
              }}
              placeholder="e.g. Data Engineer"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department" htmlFor="designation-department" error={errors.departmentId} required>
              <Select
                value={form.departmentId}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, departmentId: value }))
                  setErrors((current) => ({ ...current, departmentId: undefined }))
                }}
              >
                <SelectTrigger id="designation-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Level" htmlFor="designation-level" required>
              <Select
                value={form.level}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, level: value as Designation['level'] }))
                }
              >
                <SelectTrigger id="designation-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Grade" htmlFor="designation-grade" error={errors.grade} required hint="e.g. IC3, M2">
            <Input
              id="designation-grade"
              value={form.grade}
              onChange={(event) => {
                setForm((current) => ({ ...current, grade: event.target.value }))
                setErrors((current) => ({ ...current, grade: undefined }))
              }}
              placeholder="e.g. IC3"
            />
          </FormField>
          <DialogActions
            busy={mutation.isPending}
            submitLabel={designation ? 'Save changes' : 'Create designation'}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface BranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchWithCount | null
}

interface BranchFormState {
  name: string
  address: string
  city: string
  state: string
  phone: string
  headId: string
  isHeadquarters: boolean
}

type BranchErrors = Partial<Record<'name' | 'city' | 'state', string>>

export function BranchDialog({ open, onOpenChange, branch }: BranchDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BranchFormState>({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    headId: '',
    isHeadquarters: false,
  })
  const [errors, setErrors] = useState<BranchErrors>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      branch
        ? {
            name: branch.name,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            phone: branch.phone,
            headId: branch.headId ?? '',
            isHeadquarters: branch.isHeadquarters,
          }
        : {
            name: '',
            address: '',
            city: '',
            state: '',
            phone: '',
            headId: '',
            isHeadquarters: false,
          },
    )
  }, [open, branch])

  const mutation = useMutation({
    mutationFn: (input: Omit<Branch, 'id'>) =>
      branch ? updateBranch(branch.id, input) : createBranch(input),
    onSuccess: (saved) => {
      toast.success(branch ? 'Branch updated' : 'Branch created', {
        description: `${saved.name} is available in the organization.`,
      })
      invalidateOrganizationData(queryClient)
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error('Could not save the branch', { description: error.message }),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: BranchErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Branch name is required.'
    if (!form.city.trim()) nextErrors.city = 'City is required.'
    if (!form.state.trim()) nextErrors.state = 'State is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      phone: form.phone.trim(),
      headId: form.headId || null,
      isHeadquarters: form.isHeadquarters,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? 'Edit branch' : 'Create branch'}</DialogTitle>
          <DialogDescription>
            Branch records power office locations and headcount reporting across the organization.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Branch name" htmlFor="branch-name" error={errors.name} required>
            <Input
              id="branch-name"
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }))
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              placeholder="e.g. Mumbai Office"
            />
          </FormField>
          <FormField label="Address" htmlFor="branch-address">
            <Input
              id="branch-address"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Street, building and floor"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City" htmlFor="branch-city" error={errors.city} required>
              <Input
                id="branch-city"
                value={form.city}
                onChange={(event) => {
                  setForm((current) => ({ ...current, city: event.target.value }))
                  setErrors((current) => ({ ...current, city: undefined }))
                }}
                placeholder="e.g. Mumbai"
              />
            </FormField>
            <FormField label="State" htmlFor="branch-state" error={errors.state} required>
              <Input
                id="branch-state"
                value={form.state}
                onChange={(event) => {
                  setForm((current) => ({ ...current, state: event.target.value }))
                  setErrors((current) => ({ ...current, state: undefined }))
                }}
                placeholder="e.g. Maharashtra"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" htmlFor="branch-phone">
              <Input
                id="branch-phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+91 22 0000 0000"
              />
            </FormField>
            <FormField label="Branch head" htmlFor="branch-head">
              <Select
                value={form.headId || 'none'}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, headId: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger id="branch-head">
                  <SelectValue placeholder="Select branch head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} · {employee.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-slate-50/60 px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-foreground">Headquarters</p>
              <p className="text-[11.5px] text-slate-500">
                {branch
                  ? 'Headquarters status is fixed when a branch is created.'
                  : 'Mark this branch as the company headquarters.'}
              </p>
            </div>
            <Switch
              checked={form.isHeadquarters}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isHeadquarters: checked }))}
              disabled={Boolean(branch)}
              aria-label="Headquarters branch"
            />
          </div>
          <DialogActions
            busy={mutation.isPending}
            submitLabel={branch ? 'Save changes' : 'Create branch'}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
