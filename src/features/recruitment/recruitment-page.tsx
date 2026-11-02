import { useDeferredValue, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  FilterX,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { ErrorState } from '@/components/common/error-state'
import { ExportButton } from '@/components/common/export-button'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Rating } from '@/components/common/rating'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { getEmployeeName } from '@/data/employees'
import { getDepartmentName } from '@/data/organization'
import {
  fetchCandidates,
  fetchInterviews,
  fetchJobs,
  fetchRecruitmentSummary,
  updateJobStatus,
  type CandidateFilters,
} from '@/services'
import {
  CandidateDetailDialog,
  InterviewFeedbackDialog,
  InterviewScheduleDialog,
  JobFormDialog,
} from './recruitment-dialogs'
import { RECRUITMENT_EDIT_ROLES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Candidate, Interview, JobOpening } from '@/types'

const CANDIDATE_STAGES: Candidate['stage'][] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
]

const STAGE_COLORS: Record<string, string> = {
  Applied: 'bg-slate-400',
  Screening: 'bg-amber-400',
  Interview: 'bg-sky-500',
  Offer: 'bg-violet-500',
  Hired: 'bg-emerald-500',
}

const JOB_STATUSES: JobOpening['status'][] = ['Open', 'On Hold', 'Closed']

export function RecruitmentPage() {
  const { role } = useRole()
  const queryClient = useQueryClient()
  const canEdit = RECRUITMENT_EDIT_ROLES.includes(role)
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedTab = searchParams.get('tab')
  const requestedAction = searchParams.get('action')
  const initialTab =
    requestedTab === 'jobs' || requestedTab === 'candidates' || requestedTab === 'interviews'
      ? requestedTab
      : requestedAction === 'new-job'
        ? 'jobs'
        : 'overview'
  const [tab, setTab] = useState(initialTab)
  const [jobDialogOpen, setJobDialogOpen] = useState(
    () => requestedAction === 'new-job' && RECRUITMENT_EDIT_ROLES.includes(role),
  )

  // Allow quick links such as /recruitment?tab=jobs&action=new-job to deep-link.
  useEffect(() => {
    if (!initialTab) return
    setTab(initialTab)
  }, [initialTab])

  const clearActionParam = () => {
    if (!searchParams.has('action')) return
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }

  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs })
  const candidatesQuery = useQuery({
    queryKey: ['candidates'],
    queryFn: () => fetchCandidates({} satisfies CandidateFilters),
  })
  const interviewsQuery = useQuery({ queryKey: ['interviews'], queryFn: fetchInterviews })
  const summaryQuery = useQuery({ queryKey: ['recruitment-summary'], queryFn: fetchRecruitmentSummary })

  const [jobSearch, setJobSearch] = useState('')
  const deferredJobSearch = useDeferredValue(jobSearch)
  const [jobStatus, setJobStatus] = useState('all')
  const [jobPage, setJobPage] = useState(1)
  const [jobPageSize, setJobPageSize] = useState(10)

  const [candidateSearch, setCandidateSearch] = useState('')
  const deferredCandidateSearch = useDeferredValue(candidateSearch)
  const [candidateJobId, setCandidateJobId] = useState('all')
  const [candidateStage, setCandidateStage] = useState('all')
  const [candidatePage, setCandidatePage] = useState(1)
  const [candidatePageSize, setCandidatePageSize] = useState(10)

  const [editingJob, setEditingJob] = useState<JobOpening | null>(null)
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<{
    interview: Interview
    status: 'Completed' | 'Cancelled'
  } | null>(null)
  const [closeTarget, setCloseTarget] = useState<JobOpening | null>(null)

  const jobs = jobsQuery.data ?? []
  const candidates = candidatesQuery.data ?? []
  const interviews = interviewsQuery.data ?? []
  const summary = summaryQuery.data

  const jobStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobOpening['status'] }) => updateJobStatus(id, status),
    onSuccess: (job) => {
      toast.success(`Job marked ${job.status.toLowerCase()}`, {
        description: `${job.title} (${job.id}) was updated in the recruitment pipeline.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
      void queryClient.invalidateQueries({ queryKey: ['recruitment-summary'] })
      setCloseTarget(null)
    },
    onError: (error: Error) => toast.error('Could not update the job status', { description: error.message }),
  })

  const jobSearchLower = deferredJobSearch.trim().toLowerCase()
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = jobStatus === 'all' || job.status === jobStatus
    const matchesSearch =
      jobSearchLower.length === 0 ||
      job.title.toLowerCase().includes(jobSearchLower) ||
      job.id.toLowerCase().includes(jobSearchLower) ||
      job.location.toLowerCase().includes(jobSearchLower) ||
      getDepartmentName(job.departmentId).toLowerCase().includes(jobSearchLower)
    return matchesStatus && matchesSearch
  })
  const jobTotalPages = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize))
  const currentJobPage = Math.min(jobPage, jobTotalPages)
  const pagedJobs = filteredJobs.slice(
    (currentJobPage - 1) * jobPageSize,
    currentJobPage * jobPageSize,
  )

  const candidateSearchLower = deferredCandidateSearch.trim().toLowerCase()
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesJob = candidateJobId === 'all' || candidate.jobId === candidateJobId
    const matchesStage = candidateStage === 'all' || candidate.stage === candidateStage
    const matchesSearch =
      candidateSearchLower.length === 0 ||
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(candidateSearchLower) ||
      candidate.email.toLowerCase().includes(candidateSearchLower) ||
      candidate.currentCompany.toLowerCase().includes(candidateSearchLower)
    return matchesJob && matchesStage && matchesSearch
  })
  const candidateTotalPages = Math.max(1, Math.ceil(filteredCandidates.length / candidatePageSize))
  const currentCandidatePage = Math.min(candidatePage, candidateTotalPages)
  const pagedCandidates = filteredCandidates.slice(
    (currentCandidatePage - 1) * candidatePageSize,
    currentCandidatePage * candidatePageSize,
  )

  const upcomingInterviews = interviews.filter((interview) => interview.status === 'Scheduled').slice(0, 5)
  const feedbackCandidate = feedbackTarget
    ? candidates.find((candidate) => candidate.id === feedbackTarget.interview.candidateId)
    : undefined
  const feedbackCandidateName = feedbackCandidate
    ? `${feedbackCandidate.firstName} ${feedbackCandidate.lastName}`
    : (feedbackTarget?.interview.candidateId ?? '')

  const hasJobFilters = jobSearch !== '' || jobStatus !== 'all'
  const hasCandidateFilters =
    candidateSearch !== '' || candidateJobId !== 'all' || candidateStage !== 'all'

  const resetJobFilters = () => {
    setJobSearch('')
    setJobStatus('all')
    setJobPage(1)
  }

  const resetCandidateFilters = () => {
    setCandidateSearch('')
    setCandidateJobId('all')
    setCandidateStage('all')
    setCandidatePage(1)
  }

  const openCreateJob = () => {
    setEditingJob(null)
    setJobDialogOpen(true)
  }

  const openEditJob = (job: JobOpening) => {
    setEditingJob(job)
    setJobDialogOpen(true)
  }

  const changeJobStatus = (job: JobOpening, status: JobOpening['status']) => {
    if (job.status === status) return
    if (status === 'Closed') {
      setCloseTarget(job)
      return
    }
    jobStatusMutation.mutate({ id: job.id, status })
  }

  const jobColumns: Array<DataTableColumn<JobOpening>> = [
    {
      key: 'title',
      header: 'Role',
      cell: (job) => (
        <div className="max-w-56">
          <p className="truncate font-medium text-slate-700">{job.title}</p>
          <p className="truncate text-[11px] text-slate-400">
            {job.id} · {getEmployeeName(job.hiringManagerId)}
          </p>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      cell: (job) => <span className="text-slate-600">{getDepartmentName(job.departmentId)}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      cell: (job) => (
        <div>
          <p className="text-slate-700">{job.location}</p>
          <p className="text-[11px] text-slate-400">{job.employmentType}</p>
        </div>
      ),
    },
    {
      key: 'experience',
      header: 'Experience',
      cell: (job) => (
        <span className="whitespace-nowrap text-slate-600">
          {job.experienceMin}–{job.experienceMax} yrs
        </span>
      ),
    },
    {
      key: 'openings',
      header: 'Openings',
      cell: (job) => (
        <span className="inline-flex min-w-7 justify-center rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-slate-600">
          {job.openings}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (job) => <StatusBadge status={job.status} />,
    },
    {
      key: 'posted',
      header: 'Posted',
      cell: (job) => <span className="whitespace-nowrap text-slate-600">{formatDate(job.postedOn)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (job) => (
        <div onClick={(event) => event.stopPropagation()}>
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${job.title}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openEditJob(job)}>
                  <Pencil />
                  Edit job
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {job.status !== 'Open' ? (
                  <DropdownMenuItem onClick={() => changeJobStatus(job, 'Open')}>
                    <Play />
                    Reopen job
                  </DropdownMenuItem>
                ) : null}
                {job.status !== 'On Hold' ? (
                  <DropdownMenuItem onClick={() => changeJobStatus(job, 'On Hold')}>
                    <Pause />
                    Put on hold
                  </DropdownMenuItem>
                ) : null}
                {job.status !== 'Closed' ? (
                  <DropdownMenuItem variant="destructive" onClick={() => changeJobStatus(job, 'Closed')}>
                    <XCircle />
                    Close job
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="pr-1 text-[11px] text-slate-400">View only</span>
          )}
        </div>
      ),
    },
  ]

  const candidateColumns: Array<DataTableColumn<Candidate>> = [
    {
      key: 'candidate',
      header: 'Candidate',
      cell: (candidate) => (
        <AvatarName
          firstName={candidate.firstName}
          lastName={candidate.lastName}
          subtitle={candidate.currentCompany}
        />
      ),
    },
    {
      key: 'role',
      header: 'Applied role',
      cell: (candidate) => {
        const job = jobs.find((item) => item.id === candidate.jobId)
        return (
          <div className="max-w-44">
            <p className="truncate text-slate-700">{job?.title ?? 'Role closed'}</p>
            <p className="text-[11px] text-slate-400">{candidate.jobId}</p>
          </div>
        )
      },
    },
    {
      key: 'source',
      header: 'Source',
      cell: (candidate) => <span className="text-slate-600">{candidate.source}</span>,
    },
    {
      key: 'experience',
      header: 'Experience',
      cell: (candidate) => (
        <span className="whitespace-nowrap text-slate-600">{candidate.experienceYears} yrs</span>
      ),
    },
    {
      key: 'ctc',
      header: 'Expected CTC',
      cell: (candidate) => (
        <span className="whitespace-nowrap text-slate-600">{formatCurrency(candidate.expectedCtc, true)}</span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: (candidate) => <Rating value={candidate.rating} />,
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (candidate) => <StatusBadge status={candidate.stage} />,
    },
    {
      key: 'applied',
      header: 'Applied on',
      cell: (candidate) => (
        <span className="whitespace-nowrap text-slate-600">{formatDate(candidate.appliedOn)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (candidate) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${candidate.firstName} ${candidate.lastName}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailCandidate(candidate)}>
                <Eye />
                {canEdit ? 'View and update' : 'View candidate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const interviewColumns: Array<DataTableColumn<Interview>> = [
    {
      key: 'candidate',
      header: 'Candidate',
      cell: (interview) => {
        const candidate = candidates.find((item) => item.id === interview.candidateId)
        const job = jobs.find((item) => item.id === interview.jobId)
        return (
          <div className="min-w-0">
            {candidate ? (
              <AvatarName
                firstName={candidate.firstName}
                lastName={candidate.lastName}
                subtitle={job?.title ?? interview.jobId}
              />
            ) : (
              <p className="text-slate-600">{interview.candidateId}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'round',
      header: 'Round',
      cell: (interview) => (
        <div className="max-w-44">
          <p className="truncate text-slate-700">{interview.round}</p>
          <p className="text-[11px] text-slate-400">{interview.mode}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Date and time',
      cell: (interview) => (
        <div className="whitespace-nowrap">
          <p className="text-slate-700">{formatDate(interview.date)}</p>
          <p className="text-[11px] text-slate-400">{interview.time}</p>
        </div>
      ),
    },
    {
      key: 'interviewer',
      header: 'Interviewer',
      cell: (interview) => <span className="text-slate-600">{interview.interviewer}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (interview) => <StatusBadge status={interview.status} />,
    },
    {
      key: 'feedback',
      header: 'Feedback',
      cell: (interview) =>
        interview.feedback ? (
          <p className="max-w-52 truncate text-[12px] text-slate-500" title={interview.feedback}>
            {interview.feedback}
          </p>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (interview) => {
        if (!canEdit || interview.status !== 'Scheduled') {
          return <span className="pr-1 text-[11px] text-slate-400">{canEdit ? '—' : 'View only'}</span>
        }
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackTarget({ interview, status: 'Completed' })}
            >
              <CheckCircle2 />
              Complete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedbackTarget({ interview, status: 'Cancelled' })}
            >
              <XCircle />
              Cancel
            </Button>
          </div>
        )
      },
    },
  ]

  const jobExportRows = filteredJobs.map((job) => ({
    'Job ID': job.id,
    Title: job.title,
    Department: getDepartmentName(job.departmentId),
    Location: job.location,
    Type: job.employmentType,
    Experience: `${job.experienceMin}–${job.experienceMax} years`,
    Openings: job.openings,
    Status: job.status,
    'Posted on': job.postedOn,
    'Hiring manager': getEmployeeName(job.hiringManagerId),
    'Salary range': job.salaryRange,
  }))

  const candidateExportRows = filteredCandidates.map((candidate) => {
    const job = jobs.find((item) => item.id === candidate.jobId)
    return {
      'Candidate ID': candidate.id,
      Name: `${candidate.firstName} ${candidate.lastName}`,
      Email: candidate.email,
      Phone: candidate.phone,
      'Applied role': job?.title ?? candidate.jobId,
      Source: candidate.source,
      Stage: candidate.stage,
      'Experience (years)': candidate.experienceYears,
      'Expected CTC': candidate.expectedCtc,
      Rating: candidate.rating,
      'Applied on': candidate.appliedOn,
      Location: candidate.location,
      Company: candidate.currentCompany,
    }
  })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Talent acquisition"
        title="Recruitment"
        description="Track open roles, move candidates through the pipeline and coordinate interviews."
        actions={
          canEdit ? (
            <Button onClick={openCreateJob}>
              <Plus />
              Post a job
            </Button>
          ) : undefined
        }
      />

      <DemoNotice>
        Candidate profiles, interviews and hiring decisions are stored in the HRMS database and update the shared
        recruitment pipeline.
      </DemoNotice>

      {!canEdit ? (
        <DemoNotice>
          Your {role} role has view-only access to recruitment. Posting jobs, moving candidates and updating interviews
          are limited to Super Admin, HR Admin and HR Executive roles.
        </DemoNotice>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          clearActionParam()
        }}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job openings</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          {summaryQuery.isError ? (
            <ErrorState onRetry={() => void summaryQuery.refetch()} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Open jobs"
                  value={summary?.openJobs ?? '—'}
                  icon={Briefcase}
                  hint={`${summary?.openPositions ?? 0} positions open`}
                />
                <StatCard
                  label="Candidates"
                  value={summary?.candidates ?? '—'}
                  icon={ClipboardList}
                  hint={`${summary?.offers ?? 0} at offer stage`}
                  iconClassName="bg-violet-50 text-violet-600"
                />
                <StatCard
                  label="Interviews scheduled"
                  value={summary?.interviewsScheduled ?? '—'}
                  icon={CalendarClock}
                  hint="Upcoming in the pipeline"
                  iconClassName="bg-sky-50 text-sky-600"
                />
                <StatCard
                  label="Hires"
                  value={summary?.hired ?? '—'}
                  icon={Users}
                  hint="Marked hired this snapshot"
                  iconClassName="bg-emerald-50 text-emerald-600"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row items-start justify-between">
                    <div>
                      <CardTitle>Candidate pipeline</CardTitle>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        Active and hired candidates by stage
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTab('candidates')}>
                      Open candidates
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    {(summary?.pipeline ?? []).map((item) => {
                      const max = Math.max(...(summary?.pipeline ?? []).map((stage) => stage.count), 1)
                      return (
                        <div key={item.stage}>
                          <div className="mb-1 flex items-center justify-between text-[12px]">
                            <span className="text-slate-600">{item.stage}</span>
                            <span className="font-medium tabular-nums text-slate-700">{item.count}</span>
                          </div>
                          <Progress
                            value={(item.count / max) * 100}
                            indicatorClassName={STAGE_COLORS[item.stage] ?? 'bg-primary'}
                          />
                        </div>
                      )
                    })}
                    {(summary?.pipeline ?? []).length === 0 ? (
                      <p className="py-6 text-center text-[12.5px] text-slate-500">No pipeline data available.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-start justify-between">
                    <div>
                      <CardTitle>Upcoming interviews</CardTitle>
                      <p className="mt-0.5 text-[12px] text-slate-500">Next scheduled conversations</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTab('interviews')}>
                      View all
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingInterviews.map((interview) => {
                      const candidate = candidates.find((item) => item.id === interview.candidateId)
                      const job = jobs.find((item) => item.id === interview.jobId)
                      return (
                        <div key={interview.id} className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md bg-primary-50 text-primary">
                            <span className="text-[9px] font-semibold uppercase leading-none">
                              {formatDate(interview.date, 'MMM')}
                            </span>
                            <span className="text-[12px] font-semibold leading-tight">
                              {formatDate(interview.date, 'dd')}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium text-slate-700">
                              {candidate ? `${candidate.firstName} ${candidate.lastName}` : interview.candidateId}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {job?.title ?? interview.jobId} · {interview.time}
                            </p>
                            <p className="truncate text-[10.5px] text-slate-400">
                              {interview.round} · {interview.mode}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {upcomingInterviews.length === 0 ? (
                      <p className="py-6 text-center text-[12.5px] text-slate-500">
                        No interviews are currently scheduled.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row items-start justify-between">
                    <div>
                      <CardTitle>Recent job openings</CardTitle>
                      <p className="mt-0.5 text-[12px] text-slate-500">Latest roles posted by the hiring team</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTab('jobs')}>
                      All jobs
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {jobs.slice(0, 4).map((job) => (
                      <div
                        key={job.id}
                        className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-slate-700">{job.title}</p>
                          <p className="truncate text-[11px] text-slate-400">
                            {getDepartmentName(job.departmentId)} · {job.location} · Hiring manager:{' '}
                            {getEmployeeName(job.hiringManagerId)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            {job.openings} opening{job.openings === 1 ? '' : 's'}
                          </span>
                          <StatusBadge status={job.status} />
                        </div>
                      </div>
                    ))}
                    {jobs.length === 0 ? (
                      <p className="py-6 text-center text-[12.5px] text-slate-500">No job openings yet.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hiring outcomes</CardTitle>
                    <p className="text-[12px] text-slate-500">Snapshot from the candidate pipeline</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Offers</p>
                        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
                          {summary?.offers ?? 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Hired</p>
                        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-emerald-600">
                          {summary?.hired ?? 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11.5px]">
                        <span className="text-slate-500">Offer to hire progress</span>
                        <span className="font-medium text-slate-600">
                          {summary && summary.offers + summary.hired > 0
                            ? Math.round((summary.hired / (summary.offers + summary.hired)) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          summary && summary.offers + summary.hired > 0
                            ? (summary.hired / (summary.offers + summary.hired)) * 100
                            : 0
                        }
                        indicatorClassName="bg-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      These figures are illustrative and do not represent real hiring performance.
                    </p>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setTab('candidates')}>
                      Review candidates
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={jobSearch}
                  onChange={(event) => {
                    setJobSearch(event.target.value)
                    setJobPage(1)
                  }}
                  placeholder="Search jobs by title, department, location or ID…"
                  className="pl-9"
                  aria-label="Search job openings"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={jobStatus}
                  onValueChange={(value) => {
                    setJobStatus(value)
                    setJobPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36" aria-label="Filter jobs by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {JOB_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasJobFilters ? (
                  <Button variant="ghost" size="sm" onClick={resetJobFilters}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
                <ExportButton filename="horizon-job-openings.csv" rows={jobExportRows} />
              </div>
            </div>

            <DataTable
              columns={jobColumns}
              data={pagedJobs}
              rowKey={(job) => job.id}
              isLoading={jobsQuery.isLoading}
              isError={jobsQuery.isError}
              onRetry={() => void jobsQuery.refetch()}
              emptyTitle={hasJobFilters ? 'No jobs match these filters' : 'No job openings yet'}
              emptyDescription={
                hasJobFilters
                  ? 'Try a different search term or clear the status filter.'
                  : 'Publish the first opening to start building the hiring pipeline.'
              }
              emptyAction={
                hasJobFilters ? (
                  <Button variant="outline" size="sm" onClick={resetJobFilters}>
                    <FilterX />
                    Clear filters
                  </Button>
                ) : canEdit ? (
                  <Button size="sm" onClick={openCreateJob}>
                    <Plus />
                    Post a job
                  </Button>
                ) : undefined
              }
              footer={
                filteredJobs.length > 0 ? (
                  <Pagination
                    page={currentJobPage}
                    totalPages={jobTotalPages}
                    total={filteredJobs.length}
                    pageSize={jobPageSize}
                    onPageChange={setJobPage}
                    onPageSizeChange={(size) => {
                      setJobPageSize(size)
                      setJobPage(1)
                    }}
                    itemLabel="jobs"
                  />
                ) : null
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="candidates">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={candidateSearch}
                  onChange={(event) => {
                    setCandidateSearch(event.target.value)
                    setCandidatePage(1)
                  }}
                  placeholder="Search candidates by name, email or current company…"
                  className="pl-9"
                  aria-label="Search candidates"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={candidateJobId}
                  onValueChange={(value) => {
                    setCandidateJobId(value)
                    setCandidatePage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48" aria-label="Filter candidates by job">
                    <SelectValue placeholder="Applied role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={candidateStage}
                  onValueChange={(value) => {
                    setCandidateStage(value)
                    setCandidatePage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36" aria-label="Filter candidates by stage">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {CANDIDATE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasCandidateFilters ? (
                  <Button variant="ghost" size="sm" onClick={resetCandidateFilters}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
                <ExportButton filename="horizon-candidates.csv" rows={candidateExportRows} />
              </div>
            </div>

            <DataTable
              columns={candidateColumns}
              data={pagedCandidates}
              rowKey={(candidate) => candidate.id}
              isLoading={candidatesQuery.isLoading}
              isError={candidatesQuery.isError}
              onRetry={() => void candidatesQuery.refetch()}
              onRowClick={(candidate) => setDetailCandidate(candidate)}
              emptyTitle={hasCandidateFilters ? 'No candidates match these filters' : 'No candidates yet'}
              emptyDescription={
                hasCandidateFilters
                  ? 'Try a different search term, role or stage.'
                  : 'Candidates will appear here when they are added to the pipeline.'
              }
              emptyAction={
                hasCandidateFilters ? (
                  <Button variant="outline" size="sm" onClick={resetCandidateFilters}>
                    <FilterX />
                    Clear filters
                  </Button>
                ) : undefined
              }
              footer={
                filteredCandidates.length > 0 ? (
                  <Pagination
                    page={currentCandidatePage}
                    totalPages={candidateTotalPages}
                    total={filteredCandidates.length}
                    pageSize={candidatePageSize}
                    onPageChange={setCandidatePage}
                    onPageSizeChange={(size) => {
                      setCandidatePageSize(size)
                      setCandidatePage(1)
                    }}
                    itemLabel="candidates"
                  />
                ) : null
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground">Interview schedule</p>
                <p className="text-[11.5px] text-slate-500">
                  {interviews.filter((interview) => interview.status === 'Scheduled').length} scheduled ·{' '}
                  {interviews.filter((interview) => interview.status === 'Completed').length} completed
                </p>
              </div>
              {canEdit ? (
                <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
                  <Plus />
                  Schedule interview
                </Button>
              ) : null}
            </div>

            <DataTable
              columns={interviewColumns}
              data={interviews}
              rowKey={(interview) => interview.id}
              isLoading={interviewsQuery.isLoading}
              isError={interviewsQuery.isError}
              onRetry={() => void interviewsQuery.refetch()}
              emptyTitle="No interviews scheduled"
              emptyDescription="Schedule an interview from an active candidate to see it here."
              emptyAction={
                canEdit ? (
                  <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
                    <Plus />
                    Schedule interview
                  </Button>
                ) : undefined
              }
            />
          </Card>
        </TabsContent>
      </Tabs>

      <JobFormDialog
        open={jobDialogOpen}
        onOpenChange={(open) => {
          setJobDialogOpen(open)
          if (!open) clearActionParam()
        }}
        job={editingJob}
      />

      <CandidateDetailDialog
        open={Boolean(detailCandidate)}
        onOpenChange={(open) => !open && setDetailCandidate(null)}
        candidate={detailCandidate}
        jobs={jobs}
        canEdit={canEdit}
      />

      <InterviewScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        candidates={candidates}
      />

      <InterviewFeedbackDialog
        open={Boolean(feedbackTarget)}
        onOpenChange={(open) => !open && setFeedbackTarget(null)}
        interview={feedbackTarget?.interview ?? null}
        nextStatus={feedbackTarget?.status ?? 'Completed'}
        candidateName={feedbackCandidateName}
      />

      <ConfirmDialog
        open={Boolean(closeTarget)}
        onOpenChange={(open) => !open && setCloseTarget(null)}
        title="Close this job opening?"
        description={
          closeTarget ? (
            <>
              <span className="font-medium text-slate-700">{closeTarget.title}</span> ({closeTarget.id}) will be
              marked closed and removed from the open roles count. The record and its candidates remain available in
              the pipeline.
            </>
          ) : null
        }
        confirmLabel="Close job"
        destructive
        onConfirm={async () => {
          if (!closeTarget) return
          await jobStatusMutation.mutateAsync({ id: closeTarget.id, status: 'Closed' })
        }}
      />
    </div>
  )
}
