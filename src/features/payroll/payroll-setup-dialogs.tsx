import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { loadAllEmployees } from '@/lib/reference-data'
import { getWorkspaceDate } from '@/lib/utils'
import { createPayrollRun, saveSalaryStructure } from '@/services'
import type { PayrollRun, SalaryComponent, SalaryStructure } from '@/types'

export function CreatePayrollRunDialog({ onClose, onSaved }: {
  onClose: () => void
  onSaved: (run: PayrollRun) => void
}) {
  const [period, setPeriod] = useState(() => getWorkspaceDate().slice(0, 7))
  const mutation = useMutation({
    mutationFn: () => {
      const [year, month] = period.split('-').map(Number)
      return createPayrollRun(year, month)
    },
    onSuccess: onSaved,
  })
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create payroll run</DialogTitle>
          <DialogDescription>
            Create draft payslips from eligible employees’ salary structures. Amounts are prorated by weekdays
            from the joining or salary effective date and exclude attendance adjustments.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
          <FormField label="Payroll month" htmlFor="payroll-month" required>
            <Input id="payroll-month" type="month" required min="1900-01" max="9998-12"
              value={period} onChange={(event) => setPeriod(event.target.value)} />
          </FormField>
          {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create draft run'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditSalaryStructureDialog({ initialEmployeeId, structures, onClose, onSaved }: {
  initialEmployeeId?: string
  structures: SalaryStructure[]
  onClose: () => void
  onSaved: (structure: SalaryStructure) => void
}) {
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? '')
  const employeesQuery = useQuery({ queryKey: ['employees', 'manager-options'], queryFn: loadAllEmployees })
  const existing = structures.find((structure) => structure.employeeId === employeeId)
  const mutation = useMutation({ mutationFn: saveSalaryStructure, onSuccess: onSaved })
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit salary structure' : 'Add salary structure'}</DialogTitle>
          <DialogDescription>Enter monthly earnings and deductions for an employee.</DialogDescription>
        </DialogHeader>
        <FormField label="Employee" htmlFor="salary-employee" required>
          <Select value={employeeId} disabled={mutation.isPending}
            onValueChange={(value) => { mutation.reset(); setEmployeeId(value) }}>
            <SelectTrigger id="salary-employee">
              <SelectValue placeholder={employeesQuery.isPending ? 'Loading employees…' : 'Select employee'} />
            </SelectTrigger>
            <SelectContent>
              {employeesQuery.data?.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} · {employee.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {employeesQuery.isSuccess && !employeesQuery.data.length && (
            <p className="text-sm text-muted-foreground">Add an employee before setting up a salary structure.</p>
          )}
          {employeesQuery.isError && (
            <Button variant="link" className="h-auto p-0" onClick={() => void employeesQuery.refetch()}>
              Retry loading employees
            </Button>
          )}
        </FormField>
        {employeeId && (
          <SalaryForm key={employeeId} employeeId={employeeId} existing={existing}
            busy={mutation.isPending} error={mutation.error?.message}
            onCancel={onClose} onSubmit={(structure) => mutation.mutate(structure)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function newComponent(type: SalaryComponent['type'], name = ''): SalaryComponent {
  return { id: crypto.randomUUID(), name, amount: 0, type }
}

function SalaryForm({ employeeId, existing, busy, error, onCancel, onSubmit }: {
  employeeId: string
  existing?: SalaryStructure
  busy: boolean
  error?: string
  onCancel: () => void
  onSubmit: (structure: SalaryStructure) => void
}) {
  const [effectiveFrom, setEffectiveFrom] = useState(existing?.effectiveFrom ?? getWorkspaceDate())
  const [annualCtc, setAnnualCtc] = useState(existing ? String(existing.annualCtc) : '')
  const [earnings, setEarnings] = useState(() => existing?.earnings ?? [newComponent('earning', 'Basic salary')])
  const [deductions, setDeductions] = useState(existing?.deductions ?? [])
  const gross = earnings.reduce((sum, component) => sum + component.amount, 0)
  const annualizedGross = Number((gross * 12).toFixed(2))
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ employeeId, effectiveFrom, annualCtc: annualCtc ? Number(annualCtc) : annualizedGross, earnings, deductions })
  }
  return (
    <form className="space-y-4" onSubmit={save}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Effective from" htmlFor="salary-date" required>
          <Input id="salary-date" type="date" required value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)} />
        </FormField>
        <FormField label="Annual CTC (₹)" htmlFor="salary-ctc" hint="Defaults to monthly gross × 12">
          <Input id="salary-ctc" type="number" step="0.01" min="0.01" max="120000000"
            placeholder={String(annualizedGross)} value={annualCtc} onChange={(event) => setAnnualCtc(event.target.value)} />
        </FormField>
      </div>
      <SalaryComponents title="Monthly earnings" type="earning" values={earnings} onChange={setEarnings} />
      <SalaryComponents title="Monthly deductions" type="deduction" values={deductions} onChange={setDeductions} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy || gross <= 0}>{busy ? 'Saving…' : 'Save salary structure'}</Button>
      </DialogFooter>
    </form>
  )
}

function SalaryComponents({ title, type, values, onChange }: {
  title: string
  type: SalaryComponent['type']
  values: SalaryComponent[]
  onChange: (components: SalaryComponent[]) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title} (₹)</legend>
      {values.map((component, index) => (
        <div key={component.id} className="grid grid-cols-[1fr_7rem_auto] gap-2">
          <Input required maxLength={100} aria-label={`${type} ${index + 1} name`}
            placeholder="Component name" value={component.name}
            onChange={(event) => onChange(values.map((item) =>
              item.id === component.id ? { ...item, name: event.target.value } : item))} />
          <Input type="number" required min="0" max="10000000" step="0.01"
            aria-label={`${type} ${index + 1} amount`} value={component.amount}
            onChange={(event) => onChange(values.map((item) =>
              item.id === component.id ? { ...item, amount: Number(event.target.value) } : item))} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${type} ${index + 1}`}
            disabled={type === 'earning' && values.length === 1}
            onClick={() => onChange(values.filter((item) => item.id !== component.id))}><X /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={values.length >= 30}
        onClick={() => onChange([...values, newComponent(type)])}><Plus /> Add {type}</Button>
    </fieldset>
  )
}
