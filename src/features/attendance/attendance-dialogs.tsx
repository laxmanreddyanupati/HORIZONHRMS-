import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { getEmployeeName } from '@/data/employees'
import { decideCorrection, submitCorrection, ATTENDANCE_SNAPSHOT } from '@/services'
import { formatDate } from '@/lib/utils'
import type { AttendanceCorrection, AttendanceStatus, Employee } from '@/types'

const MIN_CORRECTION_DATE = '2026-08-03'

const CORRECTION_STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Half Day', 'On Leave', 'Absent']

export function invalidateAttendanceData(queryClient: QueryClient) {
  for (const key of [
    'attendance-daily',
    'attendance-summary',
    'attendance-corrections',
    'attendance-today',
    'attendance-employee',
    'dashboard',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}

interface CorrectionRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
  defaultEmployeeId?: string
  defaultDate?: string
}

interface CorrectionFormState {
  employeeId: string
  date: string
  requestedStatus: AttendanceStatus
  reason: string
}

type CorrectionErrors = Partial<Record<'employeeId' | 'date' | 'reason', string>>

function initialForm(employees: Employee[], employeeId?: string, date?: string): CorrectionFormState {
  const fallbackEmployee =
    employeeId && employees.some((employee) => employee.id === employeeId) ? employeeId : employees[0]?.id ?? ''
  const fallbackDate =
    date && date >= MIN_CORRECTION_DATE && date <= ATTENDANCE_SNAPSHOT ? date : ATTENDANCE_SNAPSHOT
  return {
    employeeId: fallbackEmployee,
    date: fallbackDate,
    requestedStatus: 'Present',
    reason: '',
  }
}

export function CorrectionRequestDialog({
  open,
  onOpenChange,
  employees,
  defaultEmployeeId,
  defaultDate,
}: CorrectionRequestDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CorrectionFormState>(() =>
    initialForm(employees, defaultEmployeeId, defaultDate),
  )
  const [errors, setErrors] = useState<CorrectionErrors>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(initialForm(employees, defaultEmployeeId, defaultDate))
  }, [open, employees, defaultEmployeeId, defaultDate])

  const mutation = useMutation({
    mutationFn: (input: CorrectionFormState) =>
      submitCorrection({
        employeeId: input.employeeId,
        date: input.date,
        requestedStatus: input.requestedStatus,
        reason: input.reason.trim(),
      }),
    onSuccess: (correction) => {
      toast.success('Correction request submitted', {
        description: `${getEmployeeName(correction.employeeId)} · ${formatDate(correction.date)} · ${correction.requestedStatus}`,
      })
      invalidateAttendanceData(queryClient)
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error('Could not submit the correction request', { description: error.message }),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: CorrectionErrors = {}
    if (!form.employeeId) nextErrors.employeeId = 'Select an employee.'
    if (!form.date) nextErrors.date = 'Select the attendance date.'
    else if (form.date > ATTENDANCE_SNAPSHOT) nextErrors.date = 'Future dates cannot be corrected.'
    else if (form.date < MIN_CORRECTION_DATE) {
      nextErrors.date = `Attendance is available from ${formatDate(MIN_CORRECTION_DATE)}.`
    }
    if (!form.reason.trim()) nextErrors.reason = 'Explain why this correction is needed.'
    else if (form.reason.trim().length < 10) {
      nextErrors.reason = 'Add at least 10 characters so approvers have context.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate(form)
  }

  const employeeLocked = employees.length <= 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request attendance correction</DialogTitle>
          <DialogDescription>
            Submit a correction against an existing attendance record. Requests are reviewed by an approver and update
            the register when approved.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField
            label="Employee"
            htmlFor="correction-employee"
            error={errors.employeeId}
            required
            hint={employeeLocked ? 'Your own record' : undefined}
          >
            <Select
              value={form.employeeId}
              onValueChange={(value) => {
                setForm((current) => ({ ...current, employeeId: value }))
                setErrors((current) => ({ ...current, employeeId: undefined }))
              }}
              disabled={employeeLocked}
            >
              <SelectTrigger id="correction-employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} · {employee.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Attendance date" htmlFor="correction-date" error={errors.date} required>
              <Input
                id="correction-date"
                type="date"
                min={MIN_CORRECTION_DATE}
                max={ATTENDANCE_SNAPSHOT}
                value={form.date}
                onChange={(event) => {
                  setForm((current) => ({ ...current, date: event.target.value }))
                  setErrors((current) => ({ ...current, date: undefined }))
                }}
              />
            </FormField>
            <FormField label="Requested status" htmlFor="correction-status" required>
              <Select
                value={form.requestedStatus}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, requestedStatus: value as AttendanceStatus }))
                }
              >
                <SelectTrigger id="correction-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORRECTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Reason" htmlFor="correction-reason" error={errors.reason} required>
            <Textarea
              id="correction-reason"
              value={form.reason}
              onChange={(event) => {
                setForm((current) => ({ ...current, reason: event.target.value }))
                setErrors((current) => ({ ...current, reason: undefined }))
              }}
              placeholder="Explain what happened and why the record should be corrected."
              rows={4}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || employees.length === 0}>
              {mutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CorrectionReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  correction: AttendanceCorrection | null
  decision: 'Approved' | 'Rejected'
}

export function CorrectionReviewDialog({
  open,
  onOpenChange,
  correction,
  decision,
}: CorrectionReviewDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: { id: string; decision: 'Approved' | 'Rejected' }) =>
      decideCorrection(input.id, input.decision),
    onSuccess: (result) => {
      toast.success(`Correction ${result.status.toLowerCase()}`, {
        description: `${getEmployeeName(result.employeeId)} · ${formatDate(result.date)} · ${result.currentStatus} to ${result.requestedStatus}`,
      })
      invalidateAttendanceData(queryClient)
    },
    onError: (error: Error) =>
      toast.error('Could not review the correction request', { description: error.message }),
  })

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${decision === 'Approved' ? 'Approve' : 'Reject'} this correction request?`}
      description={
        correction ? (
          <>
            <span className="font-medium text-slate-700">{getEmployeeName(correction.employeeId)}</span> requested{' '}
            <span className="font-medium text-slate-700">{correction.currentStatus}</span> to be changed to{' '}
            <span className="font-medium text-slate-700">{correction.requestedStatus}</span> for{' '}
            {formatDate(correction.date)}. {decision === 'Approved'
              ? 'The daily attendance register will be updated.'
              : 'The original attendance record will remain unchanged.'}
          </>
        ) : null
      }
      confirmLabel={decision === 'Approved' ? 'Approve request' : 'Reject request'}
      destructive={decision === 'Rejected'}
      onConfirm={async () => {
        if (!correction) return
        await mutation.mutateAsync({ id: correction.id, decision }).catch(() => undefined)
      }}
    />
  )
}
