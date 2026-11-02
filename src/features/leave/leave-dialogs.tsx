import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
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
import { Textarea } from '@/components/ui/textarea'
import { useRole } from '@/contexts/role-context'
import { getEmployeeName } from '@/data/employees'
import { getLeaveTypeById, leaveTypes } from '@/data/leaves'
import { applyForLeave, decideLeaveRequest, fetchLeaveBalances } from '@/services'
import { formatDate } from '@/lib/utils'
import type { Employee, LeaveApplicationInput, LeaveRequest, LeaveStatus } from '@/types'

interface FormErrors {
  employeeId?: string
  leaveTypeId?: string
  fromDate?: string
  toDate?: string
  reason?: string
}

interface ApplyLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeOptions: Employee[]
  defaultEmployeeId: string | null
  lockedEmployeeId: string | null
}

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  employeeOptions,
  defaultEmployeeId,
  lockedEmployeeId,
}: ApplyLeaveDialogProps) {
  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!open) return
    setEmployeeId(defaultEmployeeId ?? employeeOptions[0]?.id ?? '')
    setLeaveTypeId('')
    setFromDate('')
    setToDate('')
    setReason('')
    setErrors({})
  }, [open, defaultEmployeeId, employeeOptions])

  const balancesQuery = useQuery({
    queryKey: ['leave-balances', employeeId],
    queryFn: () => fetchLeaveBalances(employeeId),
    enabled: open && Boolean(employeeId),
  })

  const selectedType = getLeaveTypeById(leaveTypeId)
  const selectedBalance = balancesQuery.data?.find((balance) => balance.leaveTypeId === leaveTypeId)
  const availableBalance = selectedBalance
    ? Math.max(0, selectedBalance.allocated - selectedBalance.used - selectedBalance.pending)
    : null

  const isValidRange = Boolean(fromDate && toDate && parseISO(toDate) >= parseISO(fromDate))
  const days = isValidRange ? differenceInCalendarDays(parseISO(toDate), parseISO(fromDate)) + 1 : 0

  const applyMutation = useMutation({
    mutationFn: (input: LeaveApplicationInput) => applyForLeave(input),
    onSuccess: (request) => {
      toast.success('Leave request submitted', {
        description: `${getEmployeeName(request.employeeId)} · ${request.days} day(s) from ${formatDate(request.fromDate)}. Pending review.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error('Could not submit the leave request', { description: error.message }),
  })

  const handleSubmit = async () => {
    const nextErrors: FormErrors = {}
    if (!employeeId) nextErrors.employeeId = 'Select the employee this request is for.'
    if (!leaveTypeId) nextErrors.leaveTypeId = 'Choose a leave type.'
    if (!fromDate) nextErrors.fromDate = 'Choose a start date.'
    if (!toDate) nextErrors.toDate = 'Choose an end date.'
    if (fromDate && toDate && parseISO(toDate) < parseISO(fromDate)) {
      nextErrors.toDate = 'End date must be on or after the start date.'
    }
    if (reason.trim().length < 5) nextErrors.reason = 'Add a reason of at least 5 characters.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!employeeId) return

    try {
      await applyMutation.mutateAsync({
        employeeId,
        leaveTypeId,
        fromDate,
        toDate,
        reason: reason.trim(),
      })
    } catch {
      // The mutation's onError handler surfaces the message to the user.
    }
  }

  const overBalance =
    selectedType &&
    selectedType.id !== 'lt-unpaid' &&
    availableBalance !== null &&
    days > availableBalance

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Submit a leave request for approval. Balances update when the request is decided.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Employee" htmlFor="leave-employee" required error={errors.employeeId}>
            <Select
              value={employeeId || undefined}
              onValueChange={(value) => {
                setEmployeeId(value)
                setErrors((current) => ({ ...current, employeeId: undefined }))
              }}
              disabled={Boolean(lockedEmployeeId) || employeeOptions.length === 0}
            >
              <SelectTrigger id="leave-employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} · {employee.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400">
              {lockedEmployeeId
                ? 'Locked to your employee record.'
                : 'HR roles can apply on behalf of another employee.'}
            </p>
          </FormField>

          <FormField label="Leave type" htmlFor="leave-type" required error={errors.leaveTypeId}>
            <Select
              value={leaveTypeId || undefined}
              onValueChange={(value) => {
                setLeaveTypeId(value)
                setErrors((current) => ({ ...current, leaveTypeId: undefined }))
              }}
            >
              <SelectTrigger id="leave-type">
                <SelectValue placeholder="Select a leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: type.color }} />
                      {type.name} ({type.code})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="From date" htmlFor="leave-from" required error={errors.fromDate}>
              <Input
                id="leave-from"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value)
                  setErrors((current) => ({ ...current, fromDate: undefined, toDate: undefined }))
                }}
              />
            </FormField>
            <FormField label="To date" htmlFor="leave-to" required error={errors.toDate}>
              <Input
                id="leave-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => {
                  setToDate(event.target.value)
                  setErrors((current) => ({ ...current, toDate: undefined }))
                }}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-slate-50/70 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Duration</p>
              <p className="mt-0.5 text-[13px] font-medium text-slate-700">
                {days > 0
                  ? `${days} day${days === 1 ? '' : 's'} · ${formatDate(fromDate, 'dd MMM')} – ${formatDate(toDate, 'dd MMM yyyy')}`
                  : 'Choose valid from and to dates'}
              </p>
            </div>
            {selectedType ? (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
                <span className="size-2 rounded-full" style={{ backgroundColor: selectedType.color }} />
                {selectedType.name}
              </span>
            ) : null}
          </div>

          {selectedType ? (
            <div className="space-y-1.5 text-[11.5px] leading-relaxed text-slate-500">
              {selectedType.id === 'lt-unpaid' ? (
                <p>This is unpaid leave and does not consume a paid leave balance.</p>
              ) : availableBalance !== null ? (
                <p className={overBalance ? 'font-medium text-red-600' : undefined}>
                  Available balance: {availableBalance} of {selectedBalance?.allocated ?? 0} day(s)
                  {overBalance ? ' — this request exceeds the available balance and will be rejected.' : ''}
                </p>
              ) : null}
              {selectedType.requiresDocument ? (
                <p className="flex items-start gap-1.5 text-amber-700">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {selectedType.name} normally requires supporting documentation. Document upload is not available in this application.
                </p>
              ) : null}
            </div>
          ) : null}

          <FormField
            label="Reason"
            htmlFor="leave-reason"
            required
            hint={`${reason.trim().length}/500`}
            error={errors.reason}
          >
            <Textarea
              id="leave-reason"
              value={reason}
              maxLength={500}
              rows={3}
              placeholder="Briefly explain the reason for this leave request…"
              onChange={(event) => {
                setReason(event.target.value)
                setErrors((current) => ({ ...current, reason: undefined }))
              }}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={applyMutation.isPending || employeeOptions.length === 0}>
            {applyMutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ReviewLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LeaveRequest | null
}

export function ReviewLeaveDialog({ open, onOpenChange, request }: ReviewLeaveDialogProps) {
  const queryClient = useQueryClient()
  const { persona } = useRole()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) setNote('')
  }, [open, request?.id])

  const reviewMutation = useMutation({
    mutationFn: (status: Extract<LeaveStatus, 'Approved' | 'Rejected'>) => {
      if (!request) throw new Error('No leave request selected.')
      return decideLeaveRequest(request.id, status, note.trim() || undefined)
    },
    onSuccess: (updated) => {
      toast.success(updated.status === 'Approved' ? 'Leave request approved' : 'Leave request rejected', {
        description: `${getEmployeeName(updated.employeeId)} · ${updated.days} day(s). Decision recorded.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['leave-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error('Could not record the leave decision', { description: error.message }),
  })

  const type = request ? getLeaveTypeById(request.leaveTypeId) : undefined
  const isOwnRequest = Boolean(request && persona.employeeId && request.employeeId === persona.employeeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Review leave request</DialogTitle>
          <DialogDescription>
            Approve or reject this request. A note is optional and visible in the request history.
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{getEmployeeName(request.employeeId)}</p>
                  <p className="text-[11.5px] text-slate-500">
                    {request.employeeId} · applied {formatDate(request.appliedOn)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  <span className="size-2 rounded-full" style={{ backgroundColor: type?.color ?? '#94a3b8' }} />
                  {type?.name ?? 'Leave'}
                </span>
              </div>
              <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Dates</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {formatDate(request.fromDate)} – {formatDate(request.toDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Duration</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {request.days} day{request.days === 1 ? '' : 's'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Status</p>
                  <p className="mt-0.5 font-medium text-amber-700">{request.status}</p>
                </div>
              </div>
              <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-slate-600">
                {request.reason}
              </p>
            </div>

            {isOwnRequest ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-800">
                You cannot review your own leave request. Ask another approver to review it.
              </p>
            ) : (
              <FormField label="Review note" htmlFor="leave-review-note" hint="Optional">
                <Textarea
                  id="leave-review-note"
                  value={note}
                  maxLength={400}
                  rows={3}
                  placeholder="Add context for the employee (optional)…"
                  onChange={(event) => setNote(event.target.value)}
                />
              </FormField>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reviewMutation.isPending}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => reviewMutation.mutate('Rejected')}
            disabled={!request || isOwnRequest || reviewMutation.isPending}
          >
            {reviewMutation.isPending && reviewMutation.variables === 'Rejected' ? (
              <Loader2 className="animate-spin" />
            ) : (
              <XCircle />
            )}
            Reject
          </Button>
          <Button
            variant="success"
            onClick={() => reviewMutation.mutate('Approved')}
            disabled={!request || isOwnRequest || reviewMutation.isPending}
          >
            {reviewMutation.isPending && reviewMutation.variables === 'Approved' ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
