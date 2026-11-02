import { useState } from 'react'
import { Banknote, Check, Download, Paperclip, X } from 'lucide-react'
import { DetailItem, DetailList } from '@/components/common/detail-list'
import { FormField } from '@/components/common/form-field'
import { StatusBadge } from '@/components/common/status-badge'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ExpenseCategory, ExpenseClaim, ExpenseFormInput } from '@/types'

export interface ExpenseEmployeeOption {
  id: string
  name: string
}

const MAX_EXPENSE_DATE = '2026-10-30'

interface SubmitExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: ExpenseCategory[]
  employees: ExpenseEmployeeOption[]
  defaultEmployeeId: string
  lockEmployee: boolean
  onSubmit: (input: ExpenseFormInput) => Promise<void>
}

interface SubmitErrors {
  employeeId?: string
  categoryId?: string
  title?: string
  amount?: string
  date?: string
  description?: string
}

export function SubmitExpenseDialog({
  open,
  onOpenChange,
  categories,
  employees,
  defaultEmployeeId,
  lockEmployee,
  onSubmit,
}: SubmitExpenseDialogProps) {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId)
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(MAX_EXPENSE_DATE)
  const [description, setDescription] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [errors, setErrors] = useState<SubmitErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const category = categories.find((item) => item.id === categoryId)
  const amountValue = Number(amount) || 0
  const remaining = category ? category.limit - amountValue : 0

  const handleSubmit = async () => {
    const nextErrors: SubmitErrors = {}
    const parsedAmount = Number(amount)

    if (!employeeId) nextErrors.employeeId = 'Select the employee this claim belongs to.'
    if (!categoryId) nextErrors.categoryId = 'Select an expense category.'
    if (!title.trim()) nextErrors.title = 'Add a short title for the claim.'
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.'
    } else if (category && parsedAmount > category.limit) {
      nextErrors.amount = `This category allows up to ${formatCurrency(category.limit)} per claim.`
    }
    if (!date) {
      nextErrors.date = 'Choose the date the expense was incurred.'
    } else if (date > MAX_EXPENSE_DATE) {
      nextErrors.date = 'Choose a date on or before the current HRMS snapshot date.'
    }
    if (!description.trim()) nextErrors.description = 'Describe the business purpose of this expense.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit({
        employeeId,
        categoryId,
        title: title.trim(),
        amount: parsedAmount,
        date,
        description: description.trim(),
        receiptName: receiptName.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      // The page surfaces service errors through a toast; keep the form open for retry.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit an expense claim</DialogTitle>
          <DialogDescription>
            Claims are submitted for approval. Receipt files are referenced by filename; no file is uploaded by this form.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Employee" htmlFor="expense-employee" required error={errors.employeeId}>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={lockEmployee}>
              <SelectTrigger id="expense-employee" aria-label="Expense employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Category" htmlFor="expense-category" required error={errors.categoryId}>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value)
                setErrors((current) => ({ ...current, categoryId: undefined, amount: undefined }))
              }}
            >
              <SelectTrigger id="expense-category" aria-label="Expense category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Claim title" htmlFor="expense-title" required error={errors.title} className="sm:col-span-2">
            <Input
              id="expense-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Client visit — Mumbai"
              maxLength={120}
            />
          </FormField>

          <FormField label="Amount (INR)" htmlFor="expense-amount" required error={errors.amount}>
            <Input
              id="expense-amount"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setErrors((current) => ({ ...current, amount: undefined }))
              }}
              placeholder="0"
            />
          </FormField>

          <FormField
            label="Expense date"
            htmlFor="expense-date"
            required
            error={errors.date}
            hint="On or before 30 Oct 2026"
          >
            <Input
              id="expense-date"
              type="date"
              max={MAX_EXPENSE_DATE}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </FormField>

          {category ? (
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-slate-50/70 px-3 py-2 text-[11.5px]">
              <span className="text-slate-600">
                <span className="font-medium text-slate-700">{category.name}</span> limit per claim ·{' '}
                {formatCurrency(category.limit)}
              </span>
              <span className={remaining < 0 ? 'font-medium text-red-600' : 'font-medium text-emerald-700'}>
                {remaining < 0
                  ? `${formatCurrency(Math.abs(remaining))} over limit`
                  : `${formatCurrency(remaining)} remaining`}
              </span>
            </div>
          ) : null}

          <FormField
            label="Description"
            htmlFor="expense-description"
            required
            error={errors.description}
            className="sm:col-span-2"
          >
            <Textarea
              id="expense-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Business purpose, attendees and any supporting context…"
              rows={3}
            />
          </FormField>

          <FormField
            label="Receipt filename"
            htmlFor="expense-receipt"
            hint="Optional · filename only"
            className="sm:col-span-2"
          >
            <Input
              id="expense-receipt"
              value={receiptName}
              onChange={(event) => setReceiptName(event.target.value)}
              placeholder="e.g. taxi_receipt.pdf"
              maxLength={120}
            />
          </FormField>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || categories.length === 0}>
            {submitting ? 'Submitting…' : 'Submit claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ExpenseDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  claim: ExpenseClaim | null
  employeeName: string
  categoryName: string
  approverName?: string
  canReview: boolean
  isOwnClaim: boolean
  onDownloadReceipt: (claim: ExpenseClaim) => void
  onApprove: (claim: ExpenseClaim) => void
  onReject: (claim: ExpenseClaim) => void
  onReimburse: (claim: ExpenseClaim) => void
}

export function ExpenseDetailDialog({
  open,
  onOpenChange,
  claim,
  employeeName,
  categoryName,
  approverName,
  canReview,
  isOwnClaim,
  onDownloadReceipt,
  onApprove,
  onReject,
  onReimburse,
}: ExpenseDetailDialogProps) {
  const canDecide = Boolean(claim) && canReview && !isOwnClaim && claim?.status === 'Pending'
  const canReimburse = Boolean(claim) && canReview && !isOwnClaim && claim?.status === 'Approved'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {claim ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-2">
                <DialogTitle className="min-w-0">{claim.title}</DialogTitle>
                <StatusBadge status={claim.status} />
              </div>
              <DialogDescription>
                {claim.id} · Submitted {formatDate(claim.submittedOn)}
              </DialogDescription>
            </DialogHeader>

            <DetailList>
              <DetailItem label="Employee">{employeeName}</DetailItem>
              <DetailItem label="Category">{categoryName}</DetailItem>
              <DetailItem label="Amount">
                <span className="font-semibold text-foreground">{formatCurrency(claim.amount)}</span>
              </DetailItem>
              <DetailItem label="Expense date">{formatDate(claim.date)}</DetailItem>
              <DetailItem label="Submitted on">{formatDate(claim.submittedOn)}</DetailItem>
              <DetailItem label="Approval state">
                {claim.status === 'Pending'
                  ? 'Awaiting reviewer action'
                  : claim.status === 'Rejected'
                    ? 'Rejected — no reimbursement'
                    : claim.status === 'Reimbursed'
                      ? `Reimbursed on ${claim.reimbursedOn ? formatDate(claim.reimbursedOn) : 'an unrecorded date'}`
                      : `Approved by ${approverName ?? claim.approvedBy ?? 'a reviewer'}`}
              </DetailItem>
            </DetailList>

            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-1.5 rounded-lg bg-slate-50/70 px-3 py-2.5 text-[13px] leading-relaxed text-slate-600">
                {claim.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="size-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-slate-700">
                    {claim.receiptName ?? 'No receipt attached'}
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    {claim.receiptName ? 'Receipt reference stored with the claim' : 'No receipt reference recorded'}
                  </p>
                </div>
              </div>
              {claim.receiptName ? (
                <Button variant="outline" size="sm" onClick={() => onDownloadReceipt(claim)}>
                  <Download />
                  Summary
                </Button>
              ) : null}
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canDecide ? (
                <>
                  <Button variant="destructive" onClick={() => onReject(claim)}>
                    <X />
                    Reject
                  </Button>
                  <Button variant="success" onClick={() => onApprove(claim)}>
                    <Check />
                    Approve
                  </Button>
                </>
              ) : null}
              {canReimburse ? (
                <Button onClick={() => onReimburse(claim)}>
                  <Banknote />
                  Mark reimbursed
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
