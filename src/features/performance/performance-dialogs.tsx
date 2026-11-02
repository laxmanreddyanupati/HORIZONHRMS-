import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/common/form-field'
import { Rating } from '@/components/common/rating'
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
import { createGoal, submitFeedback, submitReview } from '@/services'
import type { Feedback, ReviewType } from '@/types'

export interface EmployeeOption {
  id: string
  name: string
}

export const GOAL_CATEGORIES = [
  'Delivery',
  'Customer',
  'Engineering',
  'Learning',
  'People',
  'Process',
  'Business',
  'Revenue',
]

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  defaultEmployeeId?: string
}

export function GoalFormDialog({ open, onOpenChange, employees, defaultEmployeeId }: GoalFormDialogProps) {
  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(GOAL_CATEGORIES[0])
  const [target, setTarget] = useState('')
  const [weight, setWeight] = useState('20')
  const [dueDate, setDueDate] = useState('2027-03-31')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setEmployeeId(defaultEmployeeId ?? employees[0]?.id ?? '')
    setTitle('')
    setDescription('')
    setCategory(GOAL_CATEGORIES[0])
    setTarget('')
    setWeight('20')
    setDueDate('2027-03-31')
    setErrors({})
    // Defaults should only reset when the dialog opens; the employees list is a derived prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultEmployeeId])

  const mutation = useMutation({
    mutationFn: () =>
      createGoal({
        employeeId,
        title: title.trim(),
        description: description.trim(),
        category,
        target: target.trim(),
        weight: Number(weight),
        dueDate,
      }),
    onSuccess: (goal) => {
      const employee = employees.find((item) => item.id === goal.employeeId)
      toast.success('Goal created', {
        description: `${goal.title} was assigned to ${employee?.name ?? goal.employeeId} for the active cycle.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      void queryClient.invalidateQueries({ queryKey: ['performance-summary'] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Could not create the goal', { description: error.message }),
  })

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {}
    const numericWeight = Number(weight)

    if (!employeeId) nextErrors.employeeId = 'Select an employee.'
    if (title.trim().length < 3) nextErrors.title = 'Enter a goal title of at least three characters.'
    if (description.trim().length < 10) {
      nextErrors.description = 'Add a short description of at least ten characters.'
    }
    if (!category) nextErrors.category = 'Select a category.'
    if (target.trim().length < 3) nextErrors.target = 'Describe the measurable target.'
    if (!Number.isFinite(numericWeight) || numericWeight < 1 || numericWeight > 100) {
      nextErrors.weight = 'Weight must be between 1 and 100.'
    }
    if (!dueDate) nextErrors.dueDate = 'Choose a due date.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a goal</DialogTitle>
          <DialogDescription>
            Goals are scoped to the active appraisal cycle. Weights across goals are illustrative.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Employee" required error={errors.employeeId} className="sm:col-span-2">
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={employees.length === 0}>
              <SelectTrigger aria-label="Goal employee">
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

          <FormField label="Goal title" required error={errors.title} className="sm:col-span-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Improve release cycle time"
              aria-label="Goal title"
            />
          </FormField>

          <FormField label="Description" required error={errors.description} className="sm:col-span-2">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Describe the outcome and why it matters."
              aria-label="Goal description"
            />
          </FormField>

          <FormField label="Category" required error={errors.category}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Goal category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Weight (%)" required error={errors.weight} hint="1–100">
            <Input
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              aria-label="Goal weight percentage"
            />
          </FormField>

          <FormField label="Target" required error={errors.target} className="sm:col-span-2">
            <Input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="e.g. Median release time ≤ 3 days"
              aria-label="Goal target"
            />
          </FormField>

          <FormField label="Due date" required error={errors.dueDate}>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="Goal due date"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || employees.length === 0}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Create goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ReviewFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  allowedTypes: ReviewType[]
  reviewerId: string | null
  defaultEmployeeId?: string
  defaultType?: ReviewType
  defaultRating?: number
  defaultSummary?: string
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  employees,
  allowedTypes,
  reviewerId,
  defaultEmployeeId,
  defaultType,
  defaultRating,
  defaultSummary,
}: ReviewFormDialogProps) {
  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [type, setType] = useState<ReviewType>('Self')
  const [rating, setRating] = useState(0)
  const [summary, setSummary] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setEmployeeId(defaultEmployeeId ?? employees[0]?.id ?? '')
    setType(defaultType && allowedTypes.includes(defaultType) ? defaultType : (allowedTypes[0] ?? 'Self'))
    setRating(defaultRating ?? 0)
    setSummary(defaultSummary ?? '')
    setErrors({})
    // The allowed types and employee list are derived from the role and reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultEmployeeId, defaultType, defaultRating, defaultSummary])

  const mutation = useMutation({
    mutationFn: () =>
      submitReview({
        employeeId,
        reviewerId: reviewerId ?? '',
        type,
        rating,
        summary: summary.trim(),
      }),
    onSuccess: (review) => {
      const employee = employees.find((item) => item.id === review.employeeId)
      toast.success('Review submitted', {
        description: `${review.type} review for ${employee?.name ?? review.employeeId} is now ${review.status.toLowerCase()}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['reviews'] })
      void queryClient.invalidateQueries({ queryKey: ['performance-summary'] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Could not submit the review', { description: error.message }),
  })

  const handleSubmit = () => {
    if (!reviewerId) {
      toast.error('Cannot submit this review', {
        description: 'Your account is not linked to an employee profile, so it cannot be recorded as the reviewer.',
      })
      return
    }
    const nextErrors: Record<string, string> = {}
    if (!employeeId) nextErrors.employeeId = 'Select an employee.'
    if (!allowedTypes.includes(type)) nextErrors.type = 'Choose an available review type.'
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) nextErrors.rating = 'Choose a rating from 1 to 5.'
    if (summary.trim().length < 10) nextErrors.summary = 'Add a summary of at least ten characters.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultType ? 'Edit review' : 'Submit a review'}</DialogTitle>
          <DialogDescription>
            Reviews use the active cycle. Submitting for the same employee and review type updates the existing record
            instead of creating a duplicate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Employee" required error={errors.employeeId}>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={employees.length === 0}>
              <SelectTrigger aria-label="Review employee">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Review type" required error={errors.type}>
              <Select value={type} onValueChange={(value) => setType(value as ReviewType)}>
                <SelectTrigger aria-label="Review type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedTypes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Rating" required error={errors.rating} hint={`${rating} / 5`}>
              <div className="flex h-9.5 items-center">
                <Rating value={rating} onChange={setRating} size="md" />
              </div>
            </FormField>
          </div>

          <FormField label="Summary" required error={errors.summary} hint="Visible in the review record">
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={5}
              placeholder="Summarise performance, strengths and focus areas for the next cycle."
              aria-label="Review summary"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || employees.length === 0}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FeedbackFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  fromId: string | null
  defaultEmployeeId?: string
}

export function FeedbackFormDialog({
  open,
  onOpenChange,
  employees,
  fromId,
  defaultEmployeeId,
}: FeedbackFormDialogProps) {
  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [type, setType] = useState<Feedback['type']>('Praise')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setEmployeeId(defaultEmployeeId ?? employees[0]?.id ?? '')
    setType('Praise')
    setMessage('')
    setRating(0)
    setErrors({})
    // The employee list is derived from the role scope and resets only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultEmployeeId])

  const mutation = useMutation({
    mutationFn: () =>
      submitFeedback({
        employeeId,
        fromId: fromId ?? '',
        type,
        message: message.trim(),
        ...(rating > 0 ? { rating } : {}),
      }),
    onSuccess: (feedback) => {
      const employee = employees.find((item) => item.id === feedback.employeeId)
      toast.success('Feedback submitted', {
        description: `${feedback.type} feedback was added for ${employee?.name ?? feedback.employeeId}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['feedback'] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Could not submit feedback', { description: error.message }),
  })

  const handleSubmit = () => {
    if (!fromId) {
      toast.error('Cannot submit feedback', {
        description: 'Your account is not linked to an employee profile, so it cannot be recorded as the author.',
      })
      return
    }
    const nextErrors: Record<string, string> = {}
    if (!employeeId) nextErrors.employeeId = 'Select an employee.'
    if (!type) nextErrors.type = 'Choose a feedback type.'
    if (message.trim().length < 10) nextErrors.message = 'Add feedback of at least ten characters.'
    if (rating < 0 || rating > 5) nextErrors.rating = 'Rating must be between 1 and 5.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give feedback</DialogTitle>
          <DialogDescription>
            Feedback is recorded against the selected employee and is visible to their manager and HR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Employee" required error={errors.employeeId}>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={employees.length === 0}>
              <SelectTrigger aria-label="Feedback employee">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Feedback type" required error={errors.type}>
              <Select value={type} onValueChange={(value) => setType(value as Feedback['type'])}>
                <SelectTrigger aria-label="Feedback type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Praise', 'Constructive', 'Check-in'] as Feedback['type'][]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Rating (optional)" error={errors.rating} hint="Leave blank for no rating">
              <div className="flex h-9.5 items-center gap-2">
                <Rating value={rating} onChange={setRating} size="md" />
                {rating > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setRating(0)}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </FormField>
          </div>

          <FormField label="Message" required error={errors.message}>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Share specific, constructive feedback with a clear example."
              aria-label="Feedback message"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || employees.length === 0}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
