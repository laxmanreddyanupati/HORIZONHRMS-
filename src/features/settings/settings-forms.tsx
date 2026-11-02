import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Loader2, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { leaveTypes } from '@/data/leaves'
import { roleMatrix } from '@/data/users'
import {
  createHoliday,
  deleteHoliday,
  fetchAdminHolidays,
  fetchAdminLeavePolicies,
  fetchAttendanceSettings,
  fetchCompanyProfile,
  fetchNotificationPreferences,
  fetchPayrollSettings,
  fetchRolesConfig,
  updateAttendanceSettings,
  updateCompanyProfile,
  updateLeavePolicy,
  updateNotificationPreference,
  updatePayrollSettings,
} from '@/services'
import { formatDate } from '@/lib/utils'
import type { Holiday, LeavePolicy, LeaveType } from '@/types'

type NotificationPreference = Awaited<ReturnType<typeof fetchNotificationPreferences>>[number]

function FormSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}

function FormErrorCard({ retry }: { retry: () => void }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <ErrorState onRetry={retry} />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Company                                                             */
/* ------------------------------------------------------------------ */

interface CompanyFormState {
  legalName: string
  displayName: string
  domain: string
  industry: string
  headquarters: string
  email: string
  phone: string
  website: string
  gstin: string
  pan: string
  cin: string
  currency: string
  timezone: string
  financialYear: string
  payrollFrequency: string
}

type CompanyField = keyof CompanyFormState
type CompanyErrors = Partial<Record<CompanyField, string>>

const COMPANY_IDENTITY_FIELDS: Array<{ key: CompanyField; label: string; required?: boolean }> = [
  { key: 'legalName', label: 'Legal name', required: true },
  { key: 'displayName', label: 'Display name', required: true },
  { key: 'domain', label: 'Company domain', required: true },
  { key: 'industry', label: 'Industry', required: true },
]

const COMPANY_CONTACT_FIELDS: Array<{ key: CompanyField; label: string; required?: boolean; type?: string }> = [
  { key: 'headquarters', label: 'Headquarters', required: true },
  { key: 'email', label: 'Contact email', required: true, type: 'email' },
  { key: 'phone', label: 'Contact phone', required: true },
  { key: 'website', label: 'Website' },
]

const COMPANY_STATUTORY_FIELDS: Array<{ key: CompanyField; label: string }> = [
  { key: 'gstin', label: 'GSTIN' },
  { key: 'pan', label: 'PAN' },
  { key: 'cin', label: 'CIN' },
]

const COMPANY_FINANCE_FIELDS: Array<{ key: CompanyField; label: string; required?: boolean }> = [
  { key: 'currency', label: 'Currency', required: true },
  { key: 'timezone', label: 'Timezone', required: true },
  { key: 'financialYear', label: 'Financial year', required: true },
  { key: 'payrollFrequency', label: 'Payroll frequency', required: true },
]

function validateCompany(values: CompanyFormState): CompanyErrors {
  const errors: CompanyErrors = {}
  const required: Array<[CompanyField, string]> = [
    ['legalName', 'Legal name'],
    ['displayName', 'Display name'],
    ['domain', 'Company domain'],
    ['industry', 'Industry'],
    ['headquarters', 'Headquarters'],
    ['email', 'Contact email'],
    ['phone', 'Contact phone'],
    ['currency', 'Currency'],
    ['timezone', 'Timezone'],
    ['financialYear', 'Financial year'],
    ['payrollFrequency', 'Payroll frequency'],
  ]

  for (const [key, label] of required) {
    if (!values[key].trim()) errors[key] = `${label} is required.`
  }

  if (values.domain.trim() && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(values.domain.trim())) {
    errors.domain = 'Enter a valid domain, for example horizontech.example.'
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.website.trim() && (!values.website.includes('.') || /\s/.test(values.website.trim()))) {
    errors.website = 'Enter a website address such as www.horizontech.example.'
  }

  return errors
}

export function CompanySettings() {
  const query = useQuery({ queryKey: ['company-profile'], queryFn: fetchCompanyProfile })

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSkeleton rows={10} />
        </CardContent>
      </Card>
    )
  }

  if (query.isError || !query.data) {
    return <FormErrorCard retry={() => void query.refetch()} />
  }

  return <CompanyForm initial={query.data} />
}

function CompanyForm({ initial }: { initial: CompanyFormState }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<CompanyFormState>(() => ({ ...initial }))
  const [savedValues, setSavedValues] = useState<CompanyFormState>(() => ({ ...initial }))
  const [errors, setErrors] = useState<CompanyErrors>({})

  const mutation = useMutation({
    mutationFn: (input: CompanyFormState) => updateCompanyProfile(input),
    onSuccess: (profile) => {
      setSavedValues(profile)
      toast.success('Company profile saved', {
        description: 'The company profile was saved to the HRMS database.',
      })
      void queryClient.invalidateQueries({ queryKey: ['company-profile'] })
    },
    onError: (error: Error) => toast.error('Could not save the company profile', { description: error.message }),
  })

  const update = (key: CompanyField, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  const handleSave = () => {
    const nextErrors = validateCompany(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please review the highlighted company fields.')
      return
    }
    mutation.mutate(values)
  }

  const renderField = (field: { key: CompanyField; label: string; required?: boolean; type?: string }) => (
    <FormField
      key={field.key}
      label={field.label}
      htmlFor={`company-${field.key}`}
      error={errors[field.key]}
      required={field.required}
    >
      <Input
        id={`company-${field.key}`}
        type={field.type ?? 'text'}
        value={values[field.key]}
        onChange={(event) => update(field.key, event.target.value)}
        disabled={mutation.isPending}
      />
    </FormField>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
        <p className="text-[12px] leading-relaxed text-slate-500">
          Organisation identity and payroll defaults used across the HRMS.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Identity</h4>
          <div className="grid gap-4 sm:grid-cols-2">{COMPANY_IDENTITY_FIELDS.map(renderField)}</div>
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contact</h4>
          <div className="grid gap-4 sm:grid-cols-2">{COMPANY_CONTACT_FIELDS.map(renderField)}</div>
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Statutory identifiers
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANY_STATUTORY_FIELDS.map(renderField)}
          </div>
          <DemoNotice>
            GSTIN, PAN and CIN values are stored as configured. They are not verified against a government registry.
          </DemoNotice>
        </section>

        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Finance and payroll defaults
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">{COMPANY_FINANCE_FIELDS.map(renderField)}</div>
        </section>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValues({ ...savedValues })
            setErrors({})
          }}
          disabled={mutation.isPending}
        >
          Reset changes
        </Button>
        <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Save company profile
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

interface AttendanceFormState {
  workWeek: string
  shiftStart: string
  shiftEnd: string
  graceMinutes: string
  halfDayHours: string
  fullDayHours: string
  autoMarkAbsent: boolean
  requireLocation: boolean
  allowCorrections: boolean
  correctionWindowDays: string
}

type AttendanceErrors = Partial<Record<keyof AttendanceFormState, string>>
type AttendanceTextKey =
  | 'workWeek'
  | 'shiftStart'
  | 'shiftEnd'
  | 'graceMinutes'
  | 'halfDayHours'
  | 'fullDayHours'
  | 'correctionWindowDays'
type AttendanceBooleanKey = 'autoMarkAbsent' | 'requireLocation' | 'allowCorrections'

const WORK_WEEK_OPTIONS = ['Monday to Friday', 'Monday to Saturday', 'Six-day rotating']

function numberError(value: string, label: string, min: number, max: number, integer = false) {
  if (!value.trim()) return `${label} is required.`
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return `${label} must be a number.`
  if (integer && !Number.isInteger(parsed)) return `${label} must be a whole number.`
  if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}.`
  return undefined
}

function validateAttendance(values: AttendanceFormState): AttendanceErrors {
  const errors: AttendanceErrors = {}
  if (!values.workWeek) errors.workWeek = 'Select a working week.'
  if (!values.shiftStart) errors.shiftStart = 'Shift start is required.'
  if (!values.shiftEnd) errors.shiftEnd = 'Shift end is required.'
  if (values.shiftStart && values.shiftEnd && values.shiftStart >= values.shiftEnd) {
    errors.shiftEnd = 'Shift end must be later than the start time.'
  }

  const graceError = numberError(values.graceMinutes, 'Grace period', 0, 120, true)
  if (graceError) errors.graceMinutes = graceError

  const halfDayError = numberError(values.halfDayHours, 'Half-day hours', 0.5, 24)
  if (halfDayError) errors.halfDayHours = halfDayError

  const fullDayError = numberError(values.fullDayHours, 'Full-day hours', 1, 24)
  if (fullDayError) errors.fullDayHours = fullDayError

  if (!halfDayError && !fullDayError && Number(values.halfDayHours) >= Number(values.fullDayHours)) {
    errors.fullDayHours = 'Full-day hours must be greater than half-day hours.'
  }

  const correctionError = numberError(values.correctionWindowDays, 'Correction window', 0, 30, true)
  if (correctionError) errors.correctionWindowDays = correctionError

  return errors
}

export function AttendanceSettings() {
  const query = useQuery({ queryKey: ['attendance-settings'], queryFn: fetchAttendanceSettings })

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance rules</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSkeleton rows={8} />
        </CardContent>
      </Card>
    )
  }

  if (query.isError || !query.data) {
    return <FormErrorCard retry={() => void query.refetch()} />
  }

  return <AttendanceForm initial={query.data} />
}

type AttendanceSettingsData = Awaited<ReturnType<typeof fetchAttendanceSettings>>

function AttendanceForm({ initial }: { initial: AttendanceSettingsData }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<AttendanceFormState>(() => ({
    workWeek: initial.workWeek,
    shiftStart: initial.shiftStart,
    shiftEnd: initial.shiftEnd,
    graceMinutes: String(initial.graceMinutes),
    halfDayHours: String(initial.halfDayHours),
    fullDayHours: String(initial.fullDayHours),
    autoMarkAbsent: initial.autoMarkAbsent,
    requireLocation: initial.requireLocation,
    allowCorrections: initial.allowCorrections,
    correctionWindowDays: String(initial.correctionWindowDays),
  }))
  const [savedValues, setSavedValues] = useState<AttendanceFormState>(() => ({ ...values }))
  const [errors, setErrors] = useState<AttendanceErrors>({})

  const mutation = useMutation({
    mutationFn: (input: AttendanceFormState) =>
      updateAttendanceSettings({
        workWeek: input.workWeek,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
        graceMinutes: Number(input.graceMinutes),
        halfDayHours: Number(input.halfDayHours),
        fullDayHours: Number(input.fullDayHours),
        autoMarkAbsent: input.autoMarkAbsent,
        requireLocation: input.requireLocation,
        allowCorrections: input.allowCorrections,
        correctionWindowDays: Number(input.correctionWindowDays),
      }),
    onSuccess: (settings) => {
      setSavedValues({
        workWeek: settings.workWeek,
        shiftStart: settings.shiftStart,
        shiftEnd: settings.shiftEnd,
        graceMinutes: String(settings.graceMinutes),
        halfDayHours: String(settings.halfDayHours),
        fullDayHours: String(settings.fullDayHours),
        autoMarkAbsent: settings.autoMarkAbsent,
        requireLocation: settings.requireLocation,
        allowCorrections: settings.allowCorrections,
        correctionWindowDays: String(settings.correctionWindowDays),
      })
      toast.success('Attendance settings saved', {
        description: 'Attendance rules were saved to the HRMS database.',
      })
      void queryClient.invalidateQueries({ queryKey: ['attendance-settings'] })
    },
    onError: (error: Error) => toast.error('Could not save attendance settings', { description: error.message }),
  })

  const updateText = (key: AttendanceTextKey, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  const updateBoolean = (key: AttendanceBooleanKey, value: boolean) => {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  const handleSave = () => {
    const nextErrors = validateAttendance(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please review the highlighted attendance fields.')
      return
    }
    mutation.mutate(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance rules</CardTitle>
        <p className="text-[12px] leading-relaxed text-slate-500">
          Shift defaults, worked-hour thresholds and exception handling used by attendance.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Work week" htmlFor="attendance-work-week" error={errors.workWeek} required>
            <Select
              value={values.workWeek}
              onValueChange={(value) => updateText('workWeek', value)}
              disabled={mutation.isPending}
            >
              <SelectTrigger id="attendance-work-week" aria-label="Work week">
                <SelectValue placeholder="Select work week" />
              </SelectTrigger>
              <SelectContent>
                {WORK_WEEK_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Shift start" htmlFor="attendance-shift-start" error={errors.shiftStart} required>
            <Input
              id="attendance-shift-start"
              type="time"
              value={values.shiftStart}
              onChange={(event) => updateText('shiftStart', event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>

          <FormField label="Shift end" htmlFor="attendance-shift-end" error={errors.shiftEnd} required>
            <Input
              id="attendance-shift-end"
              type="time"
              value={values.shiftEnd}
              onChange={(event) => updateText('shiftEnd', event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>

          <FormField
            label="Grace period"
            htmlFor="attendance-grace"
            error={errors.graceMinutes}
            hint="minutes"
          >
            <Input
              id="attendance-grace"
              type="number"
              min={0}
              max={120}
              step={1}
              value={values.graceMinutes}
              onChange={(event) => updateText('graceMinutes', event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>

          <FormField label="Half-day threshold" htmlFor="attendance-half-day" error={errors.halfDayHours} hint="hours">
            <Input
              id="attendance-half-day"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={values.halfDayHours}
              onChange={(event) => updateText('halfDayHours', event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>

          <FormField label="Full-day threshold" htmlFor="attendance-full-day" error={errors.fullDayHours} hint="hours">
            <Input
              id="attendance-full-day"
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={values.fullDayHours}
              onChange={(event) => updateText('fullDayHours', event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>

          <FormField
            label="Correction window"
            htmlFor="attendance-correction-window"
            error={errors.correctionWindowDays}
            hint="days"
          >
            <Input
              id="attendance-correction-window"
              type="number"
              min={0}
              max={30}
              step={1}
              value={values.correctionWindowDays}
              onChange={(event) => updateText('correctionWindowDays', event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <BooleanRow
            label="Auto-mark absent"
            description="Mark people absent when no attendance is recorded after the shift ends."
            checked={values.autoMarkAbsent}
            onChange={(checked) => updateBoolean('autoMarkAbsent', checked)}
            disabled={mutation.isPending}
          />
          <BooleanRow
            label="Require location"
            description="Ask for a work location when someone clocks in or out."
            checked={values.requireLocation}
            onChange={(checked) => updateBoolean('requireLocation', checked)}
            disabled={mutation.isPending}
          />
          <BooleanRow
            label="Allow corrections"
            description="Let employees raise attendance correction requests within the window."
            checked={values.allowCorrections}
            onChange={(checked) => updateBoolean('allowCorrections', checked)}
            disabled={mutation.isPending}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValues({ ...savedValues })
            setErrors({})
          }}
          disabled={mutation.isPending}
        >
          Reset changes
        </Button>
        <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Save attendance settings
        </Button>
      </CardFooter>
    </Card>
  )
}

function BooleanRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-700">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Payroll                                                             */
/* ------------------------------------------------------------------ */

interface PayrollFormState {
  payDay: string
  inputCutoffDay: string
  approvalRequired: boolean
  payslipRelease: string
  bankFileFormat: string
  statutoryProfile: string
  effectiveFrom: string
  pfRate: string
  esiRate: string
  professionalTax: string
  tdsMethod: string
}

type PayrollErrors = Partial<Record<keyof PayrollFormState, string>>
type PayrollTextKey =
  | 'payDay'
  | 'inputCutoffDay'
  | 'payslipRelease'
  | 'bankFileFormat'
  | 'statutoryProfile'
  | 'effectiveFrom'
  | 'pfRate'
  | 'esiRate'
  | 'professionalTax'
  | 'tdsMethod'

const PAYSLIP_RELEASE_OPTIONS = ['On payroll processing', 'One day before pay day', 'On pay day']
const BANK_FILE_OPTIONS = ['Demo CSV', 'NEFT XML (demo)', 'Excel (demo)']
const STATUTORY_PROFILE_OPTIONS = ['Demo statutory profile FY 2026–27', 'Demo statutory profile FY 2027–28']
const TDS_METHOD_OPTIONS = ['Illustrative flat-rate demo', 'Slab-based demo (illustrative)']

function validatePayroll(values: PayrollFormState): PayrollErrors {
  const errors: PayrollErrors = {}

  const payDayError = numberError(values.payDay, 'Pay day', 1, 31, true)
  if (payDayError) errors.payDay = payDayError

  const cutoffError = numberError(values.inputCutoffDay, 'Input cutoff day', 1, 31, true)
  if (cutoffError) errors.inputCutoffDay = cutoffError

  if (!values.payslipRelease) errors.payslipRelease = 'Select when payslips are released.'
  if (!values.bankFileFormat) errors.bankFileFormat = 'Select a bank file format.'
  if (!values.statutoryProfile) errors.statutoryProfile = 'Select a statutory profile.'
  if (!values.tdsMethod) errors.tdsMethod = 'Select a TDS method.'
  if (!values.effectiveFrom) errors.effectiveFrom = 'Effective from is required.'

  const pfError = numberError(values.pfRate, 'PF rate', 0, 100)
  if (pfError) errors.pfRate = pfError

  const esiError = numberError(values.esiRate, 'ESI rate', 0, 100)
  if (esiError) errors.esiRate = esiError

  const taxError = numberError(values.professionalTax, 'Professional tax', 0, 100000)
  if (taxError) errors.professionalTax = taxError

  return errors
}

export function PayrollSettings() {
  const query = useQuery({ queryKey: ['payroll-settings'], queryFn: fetchPayrollSettings })

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll settings</CardTitle>
        </CardHeader>
        <CardContent>
          <FormSkeleton rows={10} />
        </CardContent>
      </Card>
    )
  }

  if (query.isError || !query.data) {
    return <FormErrorCard retry={() => void query.refetch()} />
  }

  return <PayrollForm initial={query.data} />
}

type PayrollSettingsData = Awaited<ReturnType<typeof fetchPayrollSettings>>

function PayrollForm({ initial }: { initial: PayrollSettingsData }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<PayrollFormState>(() => ({
    payDay: String(initial.payDay),
    inputCutoffDay: String(initial.inputCutoffDay),
    approvalRequired: initial.approvalRequired,
    payslipRelease: initial.payslipRelease,
    bankFileFormat: initial.bankFileFormat,
    statutoryProfile: initial.statutoryProfile,
    effectiveFrom: initial.effectiveFrom,
    pfRate: String(initial.pfRate),
    esiRate: String(initial.esiRate),
    professionalTax: String(initial.professionalTax),
    tdsMethod: initial.tdsMethod,
  }))
  const [savedValues, setSavedValues] = useState<PayrollFormState>(() => ({ ...values }))
  const [errors, setErrors] = useState<PayrollErrors>({})

  const mutation = useMutation({
    mutationFn: (input: PayrollFormState) =>
      updatePayrollSettings({
        payDay: Number(input.payDay),
        inputCutoffDay: Number(input.inputCutoffDay),
        approvalRequired: input.approvalRequired,
        payslipRelease: input.payslipRelease,
        bankFileFormat: input.bankFileFormat,
        statutoryProfile: input.statutoryProfile,
        effectiveFrom: input.effectiveFrom,
        pfRate: Number(input.pfRate),
        esiRate: Number(input.esiRate),
        professionalTax: Number(input.professionalTax),
        tdsMethod: input.tdsMethod,
      }),
    onSuccess: (settings) => {
      setSavedValues({
        payDay: String(settings.payDay),
        inputCutoffDay: String(settings.inputCutoffDay),
        approvalRequired: settings.approvalRequired,
        payslipRelease: settings.payslipRelease,
        bankFileFormat: settings.bankFileFormat,
        statutoryProfile: settings.statutoryProfile,
        effectiveFrom: settings.effectiveFrom,
        pfRate: String(settings.pfRate),
        esiRate: String(settings.esiRate),
        professionalTax: String(settings.professionalTax),
        tdsMethod: settings.tdsMethod,
      })
      toast.success('Payroll settings saved', {
        description: 'Payroll settings were saved to the HRMS database.',
      })
      void queryClient.invalidateQueries({ queryKey: ['payroll-settings'] })
    },
    onError: (error: Error) => toast.error('Could not save payroll settings', { description: error.message }),
  })

  const updateText = (key: PayrollTextKey, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  const handleSave = () => {
    const nextErrors = validatePayroll(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please review the highlighted payroll fields.')
      return
    }
    mutation.mutate(values)
  }

  const disclaimer = initial
    ? 'Statutory rates are illustrative and are not current legal rates. No salary is disbursed by this application.'
    : ''

  return (
    <div className="space-y-4">
      <DemoNotice>
        Payroll configuration is limited to Super Admin, HR Admin and Payroll Admin roles. Access is enforced by the
        API.
      </DemoNotice>

      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-[11.5px] leading-relaxed text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="size-4 shrink-0" />
          Illustrative values — not legal compliance
        </div>
        <p className="mt-1.5">
          {disclaimer} PF, ESI, professional tax and TDS values here are stored configuration used by payroll runs.
          They do not create statutory filings or remittances.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll settings</CardTitle>
          <p className="text-[12px] leading-relaxed text-slate-500">
            Processing calendar, statutory profile and bank file defaults.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payroll calendar</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Pay day" htmlFor="payroll-pay-day" error={errors.payDay}>
                <Input
                  id="payroll-pay-day"
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  value={values.payDay}
                  onChange={(event) => updateText('payDay', event.target.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label="Input cutoff day" htmlFor="payroll-cutoff" error={errors.inputCutoffDay}>
                <Input
                  id="payroll-cutoff"
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  value={values.inputCutoffDay}
                  onChange={(event) => updateText('inputCutoffDay', event.target.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label="Effective from" htmlFor="payroll-effective-from" error={errors.effectiveFrom}>
                <Input
                  id="payroll-effective-from"
                  type="date"
                  value={values.effectiveFrom}
                  onChange={(event) => updateText('effectiveFrom', event.target.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label="Payslip release" htmlFor="payroll-payslip-release" error={errors.payslipRelease}>
                <Select
                  value={values.payslipRelease}
                  onValueChange={(value) => updateText('payslipRelease', value)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="payroll-payslip-release" aria-label="Payslip release">
                    <SelectValue placeholder="Select release timing" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYSLIP_RELEASE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <BooleanRow
              label="Require approval before processing"
              description="A second reviewer must approve a payroll run before it can be processed."
              checked={values.approvalRequired}
              onChange={(checked) => setValues((previous) => ({ ...previous, approvalRequired: checked }))}
              disabled={mutation.isPending}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Statutory and bank defaults
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="PF rate" htmlFor="payroll-pf-rate" error={errors.pfRate} hint="%">
                <Input
                  id="payroll-pf-rate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={values.pfRate}
                  onChange={(event) => updateText('pfRate', event.target.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label="ESI rate" htmlFor="payroll-esi-rate" error={errors.esiRate} hint="%">
                <Input
                  id="payroll-esi-rate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={values.esiRate}
                  onChange={(event) => updateText('esiRate', event.target.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label="Professional tax" htmlFor="payroll-pt" error={errors.professionalTax} hint="₹ / month">
                <Input
                  id="payroll-pt"
                  type="number"
                  min={0}
                  step={1}
                  value={values.professionalTax}
                  onChange={(event) => updateText('professionalTax', event.target.value)}
                  disabled={mutation.isPending}
                />
              </FormField>
              <FormField label="TDS method" htmlFor="payroll-tds" error={errors.tdsMethod}>
                <Select
                  value={values.tdsMethod}
                  onValueChange={(value) => updateText('tdsMethod', value)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="payroll-tds" aria-label="TDS method">
                    <SelectValue placeholder="Select TDS method" />
                  </SelectTrigger>
                  <SelectContent>
                    {TDS_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Bank file format"
                htmlFor="payroll-bank-file"
                error={errors.bankFileFormat}
                className="sm:col-span-2"
              >
                <Select
                  value={values.bankFileFormat}
                  onValueChange={(value) => updateText('bankFileFormat', value)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="payroll-bank-file" aria-label="Bank file format">
                    <SelectValue placeholder="Select bank file format" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_FILE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Statutory profile"
                htmlFor="payroll-statutory-profile"
                error={errors.statutoryProfile}
                className="sm:col-span-2"
              >
                <Select
                  value={values.statutoryProfile}
                  onValueChange={(value) => updateText('statutoryProfile', value)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="payroll-statutory-profile" aria-label="Statutory profile">
                    <SelectValue placeholder="Select statutory profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTORY_PROFILE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </section>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValues({ ...savedValues })
              setErrors({})
            }}
            disabled={mutation.isPending}
          >
            Reset changes
          </Button>
          <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Save payroll settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Leave policies                                                      */
/* ------------------------------------------------------------------ */

export function LeavePoliciesSettings() {
  const queryClient = useQueryClient()
  const [savingId, setSavingId] = useState<string | null>(null)

  const query = useQuery({ queryKey: ['leave-policies'], queryFn: fetchAdminLeavePolicies })

  const mutation = useMutation({
    mutationFn: ({
      leaveTypeId,
      maxConsecutiveDays,
      noticePeriodDays,
    }: {
      leaveTypeId: string
      maxConsecutiveDays: number
      noticePeriodDays: number
    }) => updateLeavePolicy(leaveTypeId, { maxConsecutiveDays, noticePeriodDays }),
    onSuccess: (policy) => {
      const typeName = leaveTypes.find((type) => type.id === policy?.leaveTypeId)?.name ?? 'Leave policy'
      toast.success(`${typeName} updated`, { description: 'Policy limits were saved to the HRMS database.' })
      void queryClient.invalidateQueries({ queryKey: ['leave-policies'] })
    },
    onError: (error: Error) => toast.error('Could not update the leave policy', { description: error.message }),
  })

  const handleSave = async (leaveTypeId: string, input: { maxConsecutiveDays: number; noticePeriodDays: number }) => {
    setSavingId(leaveTypeId)
    try {
      await mutation.mutateAsync({ leaveTypeId, ...input })
    } finally {
      setSavingId(null)
    }
  }

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (query.isError || !query.data) {
    return <FormErrorCard retry={() => void query.refetch()} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave policies</CardTitle>
        <p className="text-[12px] leading-relaxed text-slate-500">
          Edit the consecutive-day cap and notice period for each leave type. Values must be non-negative whole numbers.
        </p>
      </CardHeader>
      {query.data.length === 0 ? (
        <CardContent>
          <p className="text-[12px] text-slate-400">No leave policies are configured.</p>
        </CardContent>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {query.data.map((policy) => (
            <LeavePolicyRow
              key={policy.leaveTypeId}
              policy={policy}
              leaveType={leaveTypes.find((type) => type.id === policy.leaveTypeId)}
              isSaving={savingId === policy.leaveTypeId}
              onSave={(input) => handleSave(policy.leaveTypeId, input)}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

function LeavePolicyRow({
  policy,
  leaveType,
  isSaving,
  onSave,
}: {
  policy: LeavePolicy
  leaveType: LeaveType | undefined
  isSaving: boolean
  onSave: (input: { maxConsecutiveDays: number; noticePeriodDays: number }) => Promise<void>
}) {
  const [maxDays, setMaxDays] = useState(String(policy.maxConsecutiveDays))
  const [noticeDays, setNoticeDays] = useState(String(policy.noticePeriodDays))
  const [errors, setErrors] = useState<{ max?: string; notice?: string }>({})

  useEffect(() => {
    setMaxDays(String(policy.maxConsecutiveDays))
    setNoticeDays(String(policy.noticePeriodDays))
  }, [policy.maxConsecutiveDays, policy.noticePeriodDays])

  const handleSave = async () => {
    const nextErrors: { max?: string; notice?: string } = {}
    const max = Number(maxDays)
    const notice = Number(noticeDays)

    if (!maxDays.trim() || !Number.isInteger(max) || max < 0) {
      nextErrors.max = 'Enter a whole number of 0 or more.'
    }
    if (!noticeDays.trim() || !Number.isInteger(notice) || notice < 0) {
      nextErrors.notice = 'Enter a whole number of 0 or more.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await onSave({ maxConsecutiveDays: max, noticePeriodDays: notice })
    } catch {
      // The parent mutation already surfaces an error toast.
    }
  }

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-slate-700">{leaveType?.name ?? policy.leaveTypeId}</p>
          {leaveType ? <Badge variant="outline">{leaveType.code}</Badge> : null}
        </div>
        <p className="mt-1 text-[11.5px] text-slate-500">
          {policy.accrual}
          {leaveType ? ` · ${leaveType.annualQuota} days per year` : ''}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{policy.policy}</p>
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10.5px] text-slate-400">
          <span>{leaveType?.carryForward ? 'Carry forward allowed' : 'No carry forward'}</span>
          <span>·</span>
          <span>{leaveType?.requiresDocument ? 'Document required' : 'No document required'}</span>
          <span>·</span>
          <span>{policy.allowHalfDay ? 'Half days allowed' : 'Full days only'}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end lg:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
        <FormField label="Max consecutive days" htmlFor={`leave-max-${policy.leaveTypeId}`} error={errors.max}>
          <Input
            id={`leave-max-${policy.leaveTypeId}`}
            type="number"
            min={0}
            step={1}
            value={maxDays}
            onChange={(event) => {
              setMaxDays(event.target.value)
              setErrors((previous) => ({ ...previous, max: undefined }))
            }}
            disabled={isSaving}
          />
        </FormField>
        <FormField label="Notice days" htmlFor={`leave-notice-${policy.leaveTypeId}`} error={errors.notice}>
          <Input
            id={`leave-notice-${policy.leaveTypeId}`}
            type="number"
            min={0}
            step={1}
            value={noticeDays}
            onChange={(event) => {
              setNoticeDays(event.target.value)
              setErrors((previous) => ({ ...previous, notice: undefined }))
            }}
            disabled={isSaving}
          />
        </FormField>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="w-full sm:w-auto lg:col-span-2 xl:col-span-1"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          Save
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Holidays                                                            */
/* ------------------------------------------------------------------ */

const HOLIDAY_TYPES: Holiday['type'][] = ['Public', 'Optional', 'Company']

export function HolidaysSettings() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)

  const query = useQuery({ queryKey: ['admin-holidays'], queryFn: fetchAdminHolidays })

  const createMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: (holiday) => {
      toast.success('Holiday added', { description: `${holiday.name} · ${formatDate(holiday.date)} was added to the holiday calendar.` })
      void queryClient.invalidateQueries({ queryKey: ['admin-holidays'] })
      void queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
    onError: (error: Error) => toast.error('Could not add the holiday', { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      toast.success('Holiday removed', { description: 'The holiday calendar was updated.' })
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-holidays'] })
      void queryClient.invalidateQueries({ queryKey: ['holidays'] })
    },
    onError: (error: Error) => toast.error('Could not remove the holiday', { description: error.message }),
  })

  const columns: Array<DataTableColumn<Holiday>> = [
    {
      key: 'name',
      header: 'Holiday',
      cell: (holiday) => <span className="font-medium text-slate-700">{holiday.name}</span>,
    },
    { key: 'date', header: 'Date', cell: (holiday) => formatDate(holiday.date) },
    { key: 'type', header: 'Type', cell: (holiday) => <StatusBadge status={holiday.type} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (holiday) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setDeleteTarget(holiday)}
          aria-label={`Delete ${holiday.name}`}
        >
          <Trash2 />
          Delete
        </Button>
      ),
    },
  ]

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Holiday calendar</CardTitle>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Public, optional and company holidays used by attendance and leave calculations.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            Add holiday
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable
            columns={columns}
            data={query.data ?? []}
            rowKey={(holiday) => holiday.id}
            isLoading={query.isLoading}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            emptyTitle="No holidays configured"
            emptyDescription="Add a public, optional or company holiday to the calendar."
            emptyAction={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <CalendarPlus />
                Add holiday
              </Button>
            }
            skeletonRows={5}
          />
        </CardContent>
      </Card>

      <AddHolidayDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingDates={(query.data ?? []).map((holiday) => holiday.date)}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove this holiday?"
        description={
          deleteTarget ? (
            <>
              <span className="font-medium text-slate-700">{deleteTarget.name}</span> on{' '}
              {formatDate(deleteTarget.date)} will be removed from the holiday calendar. This does not alter historical
              attendance records.
            </>
          ) : null
        }
        confirmLabel="Remove holiday"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await deleteMutation.mutateAsync(deleteTarget.id)
          } catch {
            // The parent mutation already surfaces an error toast.
          }
        }}
      />
    </>
  )
}

function AddHolidayDialog({
  open,
  onOpenChange,
  existingDates,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingDates: string[]
  onSubmit: (input: Omit<Holiday, 'id'>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<Holiday['type']>('Public')
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setDate('')
      setType('Public')
      setErrors({})
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    const nextErrors: { name?: string; date?: string } = {}
    if (!name.trim()) nextErrors.name = 'Holiday name is required.'
    if (!date) {
      nextErrors.date = 'Holiday date is required.'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      nextErrors.date = 'Enter a valid holiday date.'
    } else if (existingDates.includes(date)) {
      nextErrors.date = 'A holiday already exists on this date.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), date, type })
      onOpenChange(false)
    } catch {
      // The parent mutation already surfaces an error toast.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a holiday</DialogTitle>
          <DialogDescription>
            Add a holiday to the shared calendar used by attendance and leave.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <FormField label="Holiday name" htmlFor="holiday-name" error={errors.name} required>
            <Input
              id="holiday-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((previous) => ({ ...previous, name: undefined }))
              }}
              placeholder="e.g. Diwali"
              disabled={submitting}
              autoFocus
            />
          </FormField>

          <FormField label="Date" htmlFor="holiday-date" error={errors.date} required>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setErrors((previous) => ({ ...previous, date: undefined }))
              }}
              disabled={submitting}
            />
          </FormField>

          <FormField label="Holiday type" htmlFor="holiday-type" required>
            <Select value={type} onValueChange={(value) => setType(value as Holiday['type'])} disabled={submitting}>
              <SelectTrigger id="holiday-type" aria-label="Holiday type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
              Add holiday
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function NotificationSettings() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['notification-preferences'], queryFn: fetchNotificationPreferences })

  const mutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<NotificationPreference, 'email' | 'inApp'>>
    }) => updateNotificationPreference(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] })
      const previous = queryClient.getQueryData<NotificationPreference[]>(['notification-preferences'])
      queryClient.setQueryData<NotificationPreference[]>(['notification-preferences'], (old) =>
        old?.map((preference) => (preference.id === id ? { ...preference, ...patch } : preference)),
      )
      return { previous }
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notification-preferences'], context.previous)
      }
      toast.error('Could not update notification preferences', { description: error.message })
    },
    onSuccess: (preference, variables) => {
      const channel = variables.patch.email !== undefined ? 'Email' : 'In-app'
      const enabled = variables.patch.email ?? variables.patch.inApp
      toast.success(`${channel} notifications ${enabled ? 'enabled' : 'disabled'}`, {
        description: `${preference.label} · preference saved`,
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (query.isError || !query.data) {
    return <FormErrorCard retry={() => void query.refetch()} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <p className="text-[12px] leading-relaxed text-slate-500">
          Choose which events should send an email or show an in-app notification.
        </p>
      </CardHeader>
      <div className="divide-y divide-border border-t border-border">
        {query.data.map((preference) => {
          const isPending = mutation.isPending && mutation.variables?.id === preference.id
          return (
            <div
              key={preference.id}
              className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-700">{preference.label}</p>
                <p className="text-[11px] text-slate-400">Event group: {preference.id}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={preference.email}
                    onCheckedChange={(checked) => mutation.mutate({ id: preference.id, patch: { email: checked } })}
                    disabled={isPending}
                    aria-label={`Email notifications for ${preference.label}`}
                  />
                  <span className="text-[12px] text-slate-600">Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={preference.inApp}
                    onCheckedChange={(checked) => mutation.mutate({ id: preference.id, patch: { inApp: checked } })}
                    disabled={isPending}
                    aria-label={`In-app notifications for ${preference.label}`}
                  />
                  <span className="text-[12px] text-slate-600">In-app</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <CardFooter>
        <p className="text-[10.5px] leading-relaxed text-slate-400">
          Preferences are saved to the HRMS database. Email delivery requires an external mail service and is not
          configured in this deployment.
        </p>
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

const MATRIX_COLUMNS: Array<{ key: 'superAdmin' | 'hrAdmin' | 'hrExecutive' | 'manager' | 'payrollAdmin' | 'employee'; label: string }> = [
  { key: 'superAdmin', label: 'Super Admin' },
  { key: 'hrAdmin', label: 'HR Admin' },
  { key: 'hrExecutive', label: 'HR Executive' },
  { key: 'manager', label: 'Manager' },
  { key: 'payrollAdmin', label: 'Payroll Admin' },
  { key: 'employee', label: 'Employee' },
]

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

export function RolesSettings() {
  const query = useQuery({ queryKey: ['roles-config'], queryFn: fetchRolesConfig })

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return <FormErrorCard retry={() => void query.refetch()} />
  }

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
      <DemoNotice>
        Role definitions and the permission matrix are read-only. Authorization is enforced by the API using the
        signed-in user's assigned role.
      </DemoNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {query.data.map((role) => (
          <Card key={role.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{role.name}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">{role.id}</p>
                </div>
                <Badge variant="outline">
                  {role.members} {role.members === 1 ? 'member' : 'members'}
                </Badge>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-slate-500">{role.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
          <p className="text-[12px] leading-relaxed text-slate-500">
            Illustrative frontend visibility by module and role. Some capabilities are scoped further inside individual
            screens.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable
            columns={matrixColumns}
            data={roleMatrix}
            rowKey={(row) => row.module}
            skeletonRows={4}
          />
        </CardContent>
      </Card>
    </div>
  )
}
