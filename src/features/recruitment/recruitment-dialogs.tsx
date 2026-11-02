import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DemoNotice } from '@/components/common/demo-notice'
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
import { departments, getDepartmentName } from '@/data/organization'
import { moveCandidate, scheduleInterview, updateCandidate, updateInterview, createJob, updateJob } from '@/services'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Candidate, EmploymentType, Interview, JobFormInput, JobOpening } from '@/types'

function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Contract', 'Internship']
const CANDIDATE_STAGES: Candidate['stage'][] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
]
const INTERVIEW_ROUNDS = [
  'Screening Call',
  'Technical Round 1',
  'Technical Round 2',
  'Hiring Manager Round',
  'Culture & Values Round',
  'Final Discussion',
]
const INTERVIEW_SLOTS = ['09:00 AM', '10:00 AM', '11:30 AM', '01:00 PM', '02:00 PM', '03:30 PM', '04:30 PM', '05:30 PM']

interface JobFormState {
  title: string
  departmentId: string
  location: string
  employmentType: EmploymentType
  experienceMin: string
  experienceMax: string
  openings: string
  salaryRange: string
  description: string
}

const emptyJobForm: JobFormState = {
  title: '',
  departmentId: departments[0]?.id ?? '',
  location: 'Hyderabad',
  employmentType: 'Full-time',
  experienceMin: '2',
  experienceMax: '5',
  openings: '1',
  salaryRange: '',
  description: '',
}

function jobToForm(job: JobOpening): JobFormState {
  return {
    title: job.title,
    departmentId: job.departmentId,
    location: job.location,
    employmentType: job.employmentType,
    experienceMin: String(job.experienceMin),
    experienceMax: String(job.experienceMax),
    openings: String(job.openings),
    salaryRange: job.salaryRange,
    description: job.description,
  }
}

interface JobFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job?: JobOpening | null
}

export function JobFormDialog({ open, onOpenChange, job = null }: JobFormDialogProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<JobFormState>(emptyJobForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setValues(job ? jobToForm(job) : emptyJobForm)
    setErrors({})
  }, [open, job])

  const mutation = useMutation({
    mutationFn: (input: JobFormInput) => (job ? updateJob(job.id, input) : createJob(input)),
    onSuccess: (savedJob) => {
      toast.success(job ? 'Job opening updated' : 'Job opening published', {
        description: `${savedJob.title} (${savedJob.id}) is now part of the recruitment pipeline.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment-summary'] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Could not save the job opening', { description: error.message }),
  })

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {}
    const experienceMin = Number(values.experienceMin)
    const experienceMax = Number(values.experienceMax)
    const openings = Number(values.openings)

    if (values.title.trim().length < 3) nextErrors.title = 'Enter a job title of at least three characters.'
    if (!values.departmentId) nextErrors.departmentId = 'Select a department.'
    if (values.location.trim().length < 2) nextErrors.location = 'Enter a work location.'
    if (!Number.isFinite(experienceMin) || experienceMin < 0) {
      nextErrors.experienceMin = 'Enter a minimum experience of zero or more.'
    }
    if (!Number.isFinite(experienceMax) || experienceMax < 0) {
      nextErrors.experienceMax = 'Enter a maximum experience of zero or more.'
    }
    if (Number.isFinite(experienceMin) && Number.isFinite(experienceMax) && experienceMax < experienceMin) {
      nextErrors.experienceMax = 'Maximum experience cannot be lower than the minimum.'
    }
    if (!Number.isInteger(openings) || openings < 1) nextErrors.openings = 'Enter at least one opening.'
    if (values.salaryRange.trim().length < 2) nextErrors.salaryRange = 'Add an indicative salary range.'
    if (values.description.trim().length < 15) {
      nextErrors.description = 'Add a short role summary of at least 15 characters.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    mutation.mutate({
      title: values.title.trim(),
      departmentId: values.departmentId,
      location: values.location.trim(),
      employmentType: values.employmentType,
      experienceMin,
      experienceMax,
      openings,
      salaryRange: values.salaryRange.trim(),
      description: values.description.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{job ? 'Edit job opening' : 'Post a job opening'}</DialogTitle>
          <DialogDescription>
            Hiring records are stored by the HRMS API. Fields marked with an asterisk are required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Job title" required error={errors.title} className="sm:col-span-2">
            <Input
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Senior Software Engineer"
              aria-label="Job title"
            />
          </FormField>

          <FormField label="Department" required error={errors.departmentId}>
            <Select
              value={values.departmentId}
              onValueChange={(value) => setValues((current) => ({ ...current, departmentId: value }))}
            >
              <SelectTrigger aria-label="Department">
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

          <FormField label="Location" required error={errors.location}>
            <Input
              value={values.location}
              onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))}
              placeholder="e.g. Hyderabad"
              aria-label="Work location"
            />
          </FormField>

          <FormField label="Employment type" required>
            <Select
              value={values.employmentType}
              onValueChange={(value) =>
                setValues((current) => ({ ...current, employmentType: value as EmploymentType }))
              }
            >
              <SelectTrigger aria-label="Employment type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Openings" required error={errors.openings}>
            <Input
              type="number"
              min={1}
              value={values.openings}
              onChange={(event) => setValues((current) => ({ ...current, openings: event.target.value }))}
              aria-label="Number of openings"
            />
          </FormField>

          <FormField label="Minimum experience (years)" required error={errors.experienceMin}>
            <Input
              type="number"
              min={0}
              value={values.experienceMin}
              onChange={(event) => setValues((current) => ({ ...current, experienceMin: event.target.value }))}
              aria-label="Minimum experience in years"
            />
          </FormField>

          <FormField label="Maximum experience (years)" required error={errors.experienceMax}>
            <Input
              type="number"
              min={0}
              value={values.experienceMax}
              onChange={(event) => setValues((current) => ({ ...current, experienceMax: event.target.value }))}
              aria-label="Maximum experience in years"
            />
          </FormField>

          <FormField label="Salary range" required error={errors.salaryRange} className="sm:col-span-2">
            <Input
              value={values.salaryRange}
              onChange={(event) => setValues((current) => ({ ...current, salaryRange: event.target.value }))}
              placeholder="e.g. ₹18L – ₹26L"
              aria-label="Salary range"
            />
          </FormField>

          <FormField
            label="Role summary"
            required
            error={errors.description}
            hint="Shown to the hiring team"
            className="sm:col-span-2"
          >
            <Textarea
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe the responsibilities, team and what success looks like."
              rows={4}
              aria-label="Role summary"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {job ? 'Save changes' : 'Publish opening'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CandidateDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: Candidate | null
  jobs: JobOpening[]
  canEdit: boolean
}

export function CandidateDetailDialog({
  open,
  onOpenChange,
  candidate,
  jobs,
  canEdit,
}: CandidateDetailDialogProps) {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<Candidate['stage']>('Applied')
  const [rating, setRating] = useState(3)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open || !candidate) return
    setStage(candidate.stage)
    setRating(candidate.rating)
    setNotes(candidate.notes ?? '')
  }, [open, candidate])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!candidate) throw new Error('Candidate not found')
      await moveCandidate(candidate.id, stage)
      return updateCandidate(candidate.id, { rating, notes: notes.trim() })
    },
    onSuccess: (updated) => {
      toast.success('Candidate updated', {
        description: `${updated.firstName} ${updated.lastName} is now in the ${updated.stage.toLowerCase()} stage.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment-summary'] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Could not update the candidate', { description: error.message }),
  })

  if (!candidate) return null

  const job = jobs.find((item) => item.id === candidate.jobId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {candidate.firstName} {candidate.lastName}
          </DialogTitle>
          <DialogDescription>
            {candidate.id} · Applied for {job?.title ?? 'a closed role'}
          </DialogDescription>
        </DialogHeader>

        {!canEdit ? (
          <DemoNotice>
            Your role has view-only access to recruitment. Candidate stage, rating and notes cannot be changed.
          </DemoNotice>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3 text-[12.5px]">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
              <a href={`mailto:${candidate.email}`} className="text-slate-700 hover:text-primary hover:underline">
                {candidate.email}
              </a>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Phone</p>
              <a href={`tel:${candidate.phone}`} className="text-slate-700 hover:text-primary hover:underline">
                {candidate.phone}
              </a>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Location</p>
              <p className="text-slate-700">{candidate.location}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Current company</p>
              <p className="text-slate-700">{candidate.currentCompany}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Experience</p>
                <p className="text-slate-700">{candidate.experienceYears} years</p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Expected CTC</p>
                <p className="text-slate-700">{formatCurrency(candidate.expectedCtc, true)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Source</p>
                <p className="text-slate-700">{candidate.source}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Applied on</p>
                <p className="text-slate-700">{formatDate(candidate.appliedOn)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Applied role</p>
              <p className="text-slate-700">{job?.title ?? '—'}</p>
              <p className="text-[11px] text-slate-400">
                {job ? `${getDepartmentName(job.departmentId)} · ${job.location}` : 'Role no longer listed'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <FormField label="Pipeline stage">
              <Select value={stage} onValueChange={(value) => setStage(value as Candidate['stage'])} disabled={!canEdit}>
                <SelectTrigger aria-label="Candidate stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STAGES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Overall rating" hint={canEdit ? 'Click to change' : 'Read only'}>
              <div className="flex items-center gap-2">
                <Rating value={rating} onChange={canEdit ? setRating : undefined} size="md" />
                <span className="text-[12px] text-slate-500">{rating} / 5</span>
              </div>
            </FormField>

            <FormField label="Interview notes" hint="Visible to the hiring team">
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!canEdit}
                rows={6}
                placeholder="Add panel feedback, availability or compensation notes."
                aria-label="Candidate notes"
              />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit ? (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              Save candidate
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface InterviewScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidates: Candidate[]
}

export function InterviewScheduleDialog({ open, onOpenChange, candidates }: InterviewScheduleDialogProps) {
  const queryClient = useQueryClient()
  const eligibleCandidates = candidates.filter(
    (candidate) => candidate.stage !== 'Hired' && candidate.stage !== 'Rejected',
  )
  const [candidateId, setCandidateId] = useState('')
  const [round, setRound] = useState(INTERVIEW_ROUNDS[1])
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState(INTERVIEW_SLOTS[1])
  const [mode, setMode] = useState<Interview['mode']>('Video')
  const [interviewer, setInterviewer] = useState('Rohan Iyer')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setCandidateId(eligibleCandidates[0]?.id ?? '')
    setRound(INTERVIEW_ROUNDS[1])
    setDate(todayIsoDate())
    setTime(INTERVIEW_SLOTS[1])
    setMode('Video')
    setInterviewer('Rohan Iyer')
    setErrors({})
    // The eligible list is derived from the candidates prop and only needs resetting when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const mutation = useMutation({
    mutationFn: () =>
      scheduleInterview({
        candidateId,
        round,
        date,
        time,
        mode,
        interviewer: interviewer.trim(),
      }),
    onSuccess: (interview) => {
      const candidate = candidates.find((item) => item.id === interview.candidateId)
      toast.success('Interview scheduled', {
        description: `${candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate'} · ${interview.date} at ${interview.time}`,
      })
      void queryClient.invalidateQueries({ queryKey: ['interviews'] })
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment-summary'] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Could not schedule the interview', { description: error.message }),
  })

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {}
    if (!candidateId) nextErrors.candidateId = 'Select a candidate.'
    if (!round) nextErrors.round = 'Select an interview round.'
    if (!date) nextErrors.date = 'Choose an interview date.'
    if (!time) nextErrors.time = 'Choose an interview time.'
    if (interviewer.trim().length < 2) nextErrors.interviewer = 'Enter the interviewer name.'
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
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>
            Hired and rejected candidates are excluded from the scheduling list.
          </DialogDescription>
        </DialogHeader>

        {eligibleCandidates.length === 0 ? (
          <DemoNotice>
            There are no active candidates available to interview. Move a candidate out of the Hired or Rejected stage
            first.
          </DemoNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Candidate" required error={errors.candidateId} className="sm:col-span-2">
            <Select value={candidateId} onValueChange={setCandidateId} disabled={eligibleCandidates.length === 0}>
              <SelectTrigger aria-label="Interview candidate">
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                {eligibleCandidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName} · {candidate.stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Round" required error={errors.round}>
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger aria-label="Interview round">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_ROUNDS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Mode" required>
            <Select value={mode} onValueChange={(value) => setMode(value as Interview['mode'])}>
              <SelectTrigger aria-label="Interview mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['Video', 'In person', 'Phone'] as Interview['mode'][]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Date" required error={errors.date}>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Interview date" />
          </FormField>

          <FormField label="Time" required error={errors.time}>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger aria-label="Interview time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Interviewer" required error={errors.interviewer} className="sm:col-span-2">
            <Input
              value={interviewer}
              onChange={(event) => setInterviewer(event.target.value)}
              placeholder="e.g. Rohan Iyer"
              aria-label="Interviewer name"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || eligibleCandidates.length === 0}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Schedule interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface InterviewFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interview: Interview | null
  candidateName: string
  nextStatus: 'Completed' | 'Cancelled'
}

export function InterviewFeedbackDialog({
  open,
  onOpenChange,
  interview,
  candidateName,
  nextStatus,
}: InterviewFeedbackDialogProps) {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFeedback(interview?.feedback ?? '')
    setError('')
  }, [open, interview])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!interview) throw new Error('Interview not found')
      const trimmed = feedback.trim()
      return updateInterview(interview.id, {
        status: nextStatus,
        ...(trimmed ? { feedback: trimmed } : {}),
      })
    },
    onSuccess: (updated) => {
      toast.success(nextStatus === 'Completed' ? 'Interview completed' : 'Interview cancelled', {
        description: `${candidateName} · ${updated.round}`,
      })
      void queryClient.invalidateQueries({ queryKey: ['interviews'] })
      void queryClient.invalidateQueries({ queryKey: ['candidates'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment-summary'] })
      onOpenChange(false)
    },
    onError: (mutationError: Error) =>
      toast.error('Could not update the interview', { description: mutationError.message }),
  })

  if (!interview) return null

  const handleSubmit = () => {
    if (nextStatus === 'Completed' && feedback.trim().length < 5) {
      setError('Add panel feedback of at least five characters before completing the interview.')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nextStatus === 'Completed' ? 'Complete interview' : 'Cancel interview'}</DialogTitle>
          <DialogDescription>
            {candidateName} · {interview.round} · {formatDate(interview.date)} at {interview.time}
          </DialogDescription>
        </DialogHeader>

        <FormField
          label="Interview feedback"
          required={nextStatus === 'Completed'}
          error={error}
          hint={nextStatus === 'Cancelled' ? 'Optional' : 'Shared with the hiring team'}
        >
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={5}
            placeholder={
              nextStatus === 'Completed'
                ? 'Summarise the candidate signal, strengths and concerns from the panel.'
                : 'Add a reason for cancelling this interview (optional).'
            }
            aria-label="Interview feedback"
          />
        </FormField>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Keep as scheduled
          </Button>
          <Button
            variant={nextStatus === 'Cancelled' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {nextStatus === 'Completed' ? 'Mark completed' : 'Cancel interview'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
