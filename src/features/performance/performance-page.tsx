import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FilterX,
  MessageSquare,
  Pencil,
  Plus,
  Star,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { AvatarName } from '@/components/common/avatar-name'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { DemoNotice } from '@/components/common/demo-notice'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { Rating } from '@/components/common/rating'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import {
  employees,
  getEmployeeById,
  getEmployeeName,
} from '@/data/employees'
import {
  fetchCycles,
  fetchFeedback,
  fetchGoals,
  fetchPerformanceSummary,
  fetchReviews,
  updateGoalProgress,
} from '@/services'
import {
  FeedbackFormDialog,
  GOAL_CATEGORIES,
  GoalFormDialog,
  ReviewFormDialog,
  type EmployeeOption,
} from './performance-dialogs'
import { PERFORMANCE_EDIT_ROLES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Feedback, Goal, GoalStatus, Review, ReviewType } from '@/types'

const GOAL_STATUS_ORDER: GoalStatus[] = ['Not Started', 'On Track', 'At Risk', 'Completed']

const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  'Not Started': 'bg-slate-400',
  'On Track': 'bg-emerald-500',
  'At Risk': 'bg-amber-500',
  Completed: 'bg-primary',
}

const PROGRESS_STEPS = Array.from({ length: 11 }, (_, index) => index * 10)

const FEEDBACK_VARIANTS: Record<Feedback['type'], 'success' | 'warning' | 'info'> = {
  Praise: 'success',
  Constructive: 'warning',
  'Check-in': 'info',
}

interface ReviewDialogState {
  employeeId: string
  type?: ReviewType
  rating: number
  summary: string
}

function EmployeeCell({ employeeId }: { employeeId: string }) {
  const employee = getEmployeeById(employeeId)
  if (!employee) return <span className="text-slate-600">{employeeId}</span>
  return <AvatarName firstName={employee.firstName} lastName={employee.lastName} subtitle={employee.id} />
}

export function PerformancePage() {
  const { role, persona } = useRole()
  const queryClient = useQueryClient()

  const isEmployee = role === 'employee'
  const isManager = role === 'manager'
  const isHr = !isEmployee && !isManager
  const canManageGoals = PERFORMANCE_EDIT_ROLES.includes(role)

  const personaId = persona.employeeId
  const selfEmployeeId = personaId ?? ''
  const directReports = personaId
    ? employees.filter((employee) => employee.managerId === personaId)
    : []
  const directReportIds = directReports.map((employee) => employee.id)
  const scopeIds: string[] | null = isEmployee ? [selfEmployeeId] : isManager ? directReportIds : null
  const inScope = (employeeId: string) => scopeIds === null || scopeIds.includes(employeeId)

  const goalsQuery = useQuery({
    queryKey: ['goals', role, isEmployee ? selfEmployeeId : 'all'],
    queryFn: () => fetchGoals(isEmployee ? selfEmployeeId : undefined),
    enabled: !isEmployee || Boolean(selfEmployeeId),
  })
  const reviewsQuery = useQuery({
    queryKey: ['reviews', role, isEmployee ? selfEmployeeId : 'all'],
    queryFn: () => (isEmployee ? fetchReviews({ employeeId: selfEmployeeId }) : fetchReviews()),
    enabled: !isEmployee || Boolean(selfEmployeeId),
  })
  const feedbackQuery = useQuery({
    queryKey: ['feedback', role, isEmployee ? selfEmployeeId : 'all'],
    queryFn: () => (isEmployee ? fetchFeedback(selfEmployeeId) : fetchFeedback()),
    enabled: !isEmployee || Boolean(selfEmployeeId),
  })
  const cyclesQuery = useQuery({ queryKey: ['cycles'], queryFn: fetchCycles })
  const summaryQuery = useQuery({ queryKey: ['performance-summary'], queryFn: fetchPerformanceSummary })

  const [goalEmployee, setGoalEmployee] = useState('all')
  const [goalStatus, setGoalStatus] = useState('all')
  const [goalCategory, setGoalCategory] = useState('all')
  const [reviewCycle, setReviewCycle] = useState('all')
  const [reviewStatus, setReviewStatus] = useState('all')

  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalDefaultEmployee, setGoalDefaultEmployee] = useState<string | undefined>(undefined)
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)

  const selfName = getEmployeeName(selfEmployeeId)
  const employeeOptions: EmployeeOption[] = isEmployee
    ? [{ id: selfEmployeeId, name: selfName === '—' ? persona.name : selfName }]
    : isManager
      ? directReports.map((employee) => ({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
        }))
      : employees.map((employee) => ({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
        }))

  const allowedReviewTypes: ReviewType[] = isEmployee
    ? ['Self']
    : isManager
      ? ['Manager']
      : ['Self', 'Manager', 'Peer', 'HR']
  const reviewerId = personaId

  const scopedGoals = (goalsQuery.data ?? []).filter((goal) => inScope(goal.employeeId))
  const scopedReviews = (reviewsQuery.data ?? []).filter((review) => inScope(review.employeeId))
  const scopedFeedback = (feedbackQuery.data ?? []).filter((item) => inScope(item.employeeId))
  const cycles = cyclesQuery.data ?? []
  const activeCycle = cycles.find((cycle) => cycle.status === 'Active')
  const summary = summaryQuery.data

  const goalCategories = Array.from(new Set([...GOAL_CATEGORIES, ...scopedGoals.map((goal) => goal.category)])).sort()
  const hasGoalFilters = goalEmployee !== 'all' || goalStatus !== 'all' || goalCategory !== 'all'
  const filteredGoals = scopedGoals.filter((goal) => {
    const matchesEmployee = goalEmployee === 'all' || goal.employeeId === goalEmployee
    const matchesStatus = goalStatus === 'all' || goal.status === goalStatus
    const matchesCategory = goalCategory === 'all' || goal.category === goalCategory
    return matchesEmployee && matchesStatus && matchesCategory
  })

  const hasReviewFilters = reviewCycle !== 'all' || reviewStatus !== 'all'
  const filteredReviews = scopedReviews.filter((review) => {
    const matchesCycle = reviewCycle === 'all' || review.cycleId === reviewCycle
    const matchesStatus = reviewStatus === 'all' || review.status === reviewStatus
    return matchesCycle && matchesStatus
  })

  const activeCycleReviews = activeCycle
    ? scopedReviews.filter((review) => review.cycleId === activeCycle.id)
    : []
  const completedActiveCycleReviews = activeCycleReviews.filter((review) => review.status === 'Completed').length
  const reviewCompletion =
    activeCycleReviews.length > 0 ? (completedActiveCycleReviews / activeCycleReviews.length) * 100 : 0
  const daysRemaining = activeCycle ? differenceInDays(parseISO(activeCycle.endDate), new Date()) : 0

  const completedScopedReviews = scopedReviews.filter((review) => review.status === 'Completed')
  const scopedAverageRating =
    completedScopedReviews.length > 0
      ? completedScopedReviews.reduce((sum, review) => sum + review.rating, 0) / completedScopedReviews.length
      : 0
  const ratingBuckets = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: completedScopedReviews.filter((review) => review.rating === rating).length,
  }))
  const maxRatingBucket = Math.max(...ratingBuckets.map((bucket) => bucket.count), 1)

  const progressMutation = useMutation({
    mutationFn: ({ goalId, progress }: { goalId: string; progress: number }) =>
      updateGoalProgress(goalId, progress),
    onSuccess: (goal) => {
      toast.success('Goal progress updated', {
        description: `${goal.title} is now ${goal.progress}% complete and marked ${goal.status.toLowerCase()}.`,
      })
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      void queryClient.invalidateQueries({ queryKey: ['performance-summary'] })
    },
    onError: (error: Error) => toast.error('Could not update goal progress', { description: error.message }),
  })

  const canEditGoal = (goal: Goal) => {
    if (!canManageGoals) return false
    if (isManager) return directReportIds.includes(goal.employeeId)
    return true
  }

  const canEditReview = (review: Review) => {
    if (!allowedReviewTypes.includes(review.type)) return false
    if (isEmployee) return review.employeeId === selfEmployeeId
    if (isManager) return directReportIds.includes(review.employeeId)
    return isHr
  }

  const resetGoalFilters = () => {
    setGoalEmployee('all')
    setGoalStatus('all')
    setGoalCategory('all')
  }

  const resetReviewFilters = () => {
    setReviewCycle('all')
    setReviewStatus('all')
  }

  const openCreateGoal = () => {
    setGoalDefaultEmployee(employeeOptions[0]?.id)
    setGoalDialogOpen(true)
  }

  const openNewReview = () => {
    setReviewDialog({ employeeId: employeeOptions[0]?.id ?? '', rating: 0, summary: '' })
  }

  const openReview = (review: Review) => {
    setReviewDialog({
      employeeId: review.employeeId,
      type: review.type,
      rating: review.rating,
      summary: review.summary ?? '',
    })
  }

  const goalColumns: Array<DataTableColumn<Goal>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (goal) => <EmployeeCell employeeId={goal.employeeId} />,
    },
    {
      key: 'goal',
      header: 'Goal',
      cell: (goal) => (
        <div className="max-w-64">
          <p className="truncate font-medium text-slate-700">{goal.title}</p>
          <p className="truncate text-[11px] text-slate-400" title={goal.description}>
            {goal.description}
          </p>
          <p className="truncate text-[11px] text-slate-500">Target: {goal.target}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (goal) => <Badge variant="outline">{goal.category}</Badge>,
    },
    {
      key: 'weight',
      header: 'Weight',
      cell: (goal) => <span className="whitespace-nowrap text-slate-600">{goal.weight}%</span>,
    },
    {
      key: 'progress',
      header: 'Progress',
      cell: (goal) => {
        const options = Array.from(new Set([...PROGRESS_STEPS, goal.progress])).sort((a, b) => a - b)
        return (
          <div className="flex items-center gap-2">
            <Progress
              value={goal.progress}
              className="w-24"
              indicatorClassName={
                goal.status === 'Completed'
                  ? 'bg-emerald-500'
                  : goal.status === 'At Risk'
                    ? 'bg-amber-500'
                    : 'bg-primary'
              }
            />
            <span className="w-9 text-right text-[11.5px] tabular-nums text-slate-600">{goal.progress}%</span>
            {canEditGoal(goal) ? (
              <Select
                value={String(goal.progress)}
                onValueChange={(value) =>
                  progressMutation.mutate({ goalId: goal.id, progress: Number(value) })
                }
                disabled={progressMutation.isPending}
              >
                <SelectTrigger
                  className="h-7 w-[76px] px-2 text-[11px]"
                  aria-label={`Update progress for ${goal.title}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'due',
      header: 'Due date',
      cell: (goal) => <span className="whitespace-nowrap text-slate-600">{formatDate(goal.dueDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (goal) => <StatusBadge status={goal.status} />,
    },
  ]

  const reviewColumns: Array<DataTableColumn<Review>> = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (review) => <EmployeeCell employeeId={review.employeeId} />,
    },
    {
      key: 'cycle',
      header: 'Cycle',
      cell: (review) => (
        <div className="max-w-44">
          <p className="truncate text-slate-700">
            {cycles.find((cycle) => cycle.id === review.cycleId)?.name ?? review.cycleId}
          </p>
          <p className="text-[11px] text-slate-400">{review.cycleId}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (review) => <Badge variant="outline">{review.type}</Badge>,
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      cell: (review) => <span className="text-slate-600">{getEmployeeName(review.reviewerId)}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: (review) => (
        <div className="flex items-center gap-1.5">
          <Rating value={review.rating} />
          <span className="text-[11px] text-slate-500">{review.rating}/5</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (review) => <StatusBadge status={review.status} />,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (review) => (
        <span className="whitespace-nowrap text-slate-600">
          {review.submittedOn ? formatDate(review.submittedOn) : '—'}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Summary',
      cell: (review) =>
        review.summary ? (
          <p className="max-w-56 truncate text-[12px] text-slate-500" title={review.summary}>
            {review.summary}
          </p>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (review) =>
        canEditReview(review) ? (
          <Button variant="ghost" size="sm" onClick={() => openReview(review)}>
            <Pencil />
            {review.status === 'Completed' ? 'Edit' : 'Submit'}
          </Button>
        ) : (
          <span className="pr-1 text-[11px] text-slate-400">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Performance and growth"
        title="Performance"
        description="Review goals, appraisal progress and feedback."
        actions={
          <>
            {canManageGoals && employeeOptions.length > 0 ? (
              <Button variant="outline" onClick={openCreateGoal}>
                <Plus />
                New goal
              </Button>
            ) : null}
            {employeeOptions.length > 0 ? (
              <Button onClick={openNewReview}>
                <ClipboardCheck />
                Submit review
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          {summaryQuery.isError ? <ErrorState onRetry={() => void summaryQuery.refetch()} /> : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active goals"
              value={summary?.totalGoals ?? '—'}
              icon={Target}
              hint={`${scopedGoals.length} visible in your scope`}
            />
            <StatCard
              label="On track"
              value={summary?.onTrack ?? '—'}
              icon={CheckCircle2}
              hint="Across goals in scope"
              iconClassName="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="At risk"
              value={summary?.atRisk ?? '—'}
              icon={AlertTriangle}
              hint="Goals needing attention"
              iconClassName="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Reviews completed"
              value={
                summary ? `${summary.completedReviews}/${summary.completedReviews + summary.pendingReviews}` : '—'
              }
              icon={ClipboardCheck}
              hint={`Average rating ${scopedAverageRating.toFixed(1)} / 5`}
              iconClassName="bg-violet-50 text-violet-600"
            />
          </div>

          <DemoNotice>
            Summary cards reflect every goal and review visible to your role. Tables and completion figures apply the
            filters selected on this page.
          </DemoNotice>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Goal status distribution</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {scopedGoals.length} goal{scopedGoals.length === 1 ? '' : 's'} in the current scope
                  </p>
                </div>
                <Badge variant="secondary">{isEmployee ? 'My goals' : isManager ? 'Team goals' : 'All goals'}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {GOAL_STATUS_ORDER.map((status) => {
                  const count = scopedGoals.filter((goal) => goal.status === status).length
                  const share = scopedGoals.length > 0 ? (count / scopedGoals.length) * 100 : 0
                  return (
                    <div key={status}>
                      <div className="mb-1.5 flex items-center justify-between text-[12px]">
                        <span className="text-slate-600">{status}</span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {count} · {Math.round(share)}%
                        </span>
                      </div>
                      <Progress value={share} indicatorClassName={GOAL_STATUS_COLORS[status]} />
                    </div>
                  )
                })}
                {scopedGoals.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] text-slate-500">
                    No goals have been seeded for this account's scope.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Active cycle</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">Current appraisal window</p>
                </div>
                {activeCycle ? <StatusBadge status={activeCycle.status} /> : null}
              </CardHeader>
              <CardContent>
                {activeCycle ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[15px] font-semibold tracking-tight text-foreground">{activeCycle.name}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500">{activeCycle.period}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Starts</p>
                        <p className="text-slate-700">{formatDate(activeCycle.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Ends</p>
                        <p className="text-slate-700">{formatDate(activeCycle.endDate)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="text-slate-500">Review completion</span>
                        <span className="font-medium text-slate-700">{Math.round(reviewCompletion)}%</span>
                      </div>
                      <Progress value={reviewCompletion} indicatorClassName="bg-primary" />
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {completedActiveCycleReviews} of {activeCycleReviews.length} reviews complete in your scope
                      </p>
                    </div>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-500">
                      {daysRemaining > 0
                        ? `${daysRemaining} days remaining in this cycle.`
                        : daysRemaining === 0
                          ? 'This cycle ends today.'
                          : 'This cycle has passed its end date.'}
                    </p>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[12.5px] text-slate-500">No active appraisal cycle.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Review completion</CardTitle>
                <p className="text-[12px] text-slate-500">Active cycle progress for the current scope</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      {completedActiveCycleReviews}
                      <span className="text-base font-medium text-slate-400"> / {activeCycleReviews.length}</span>
                    </p>
                    <p className="text-[11.5px] text-slate-500">Reviews completed</p>
                  </div>
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700">
                    {Math.round(reviewCompletion)}% complete
                  </span>
                </div>
                <Progress value={reviewCompletion} className="h-2" />
                <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-slate-400">Pending</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-amber-600">
                      {activeCycleReviews.length - completedActiveCycleReviews}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-slate-400">Completed</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-emerald-600">
                      {completedActiveCycleReviews}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Completion is based on reviews visible to your role and the active cycle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Rating overview</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">Completed reviews in the current scope</p>
                </div>
                <Star className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-semibold tracking-tight text-foreground">
                    {scopedAverageRating.toFixed(1)}
                  </p>
                  <div>
                    <Rating value={scopedAverageRating} size="md" />
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {completedScopedReviews.length} completed review
                      {completedScopedReviews.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {ratingBuckets.map((bucket) => (
                    <div key={bucket.rating} className="flex items-center gap-2 text-[11.5px]">
                      <span className="w-7 shrink-0 text-slate-500">{bucket.rating}★</span>
                      <Progress
                        value={(bucket.count / maxRatingBucket) * 100}
                        className="flex-1"
                        indicatorClassName="bg-amber-400"
                      />
                      <span className="w-5 text-right tabular-nums text-slate-500">{bucket.count}</span>
                    </div>
                  ))}
                </div>
                {completedScopedReviews.length === 0 ? (
                  <p className="mt-3 text-center text-[11.5px] text-slate-500">
                    No completed reviews yet in this scope.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-2 sm:grid-cols-3">
                <Select value={goalEmployee} onValueChange={setGoalEmployee}>
                  <SelectTrigger className="w-full sm:w-48" aria-label="Filter goals by employee">
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employeeOptions.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={goalStatus} onValueChange={setGoalStatus}>
                  <SelectTrigger className="w-full sm:w-36" aria-label="Filter goals by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {GOAL_STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={goalCategory} onValueChange={setGoalCategory}>
                  <SelectTrigger className="w-full sm:w-36" aria-label="Filter goals by category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {goalCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasGoalFilters ? (
                  <Button variant="ghost" size="sm" onClick={resetGoalFilters}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
                {canManageGoals && employeeOptions.length > 0 ? (
                  <Button size="sm" onClick={openCreateGoal}>
                    <Plus />
                    Create goal
                  </Button>
                ) : null}
              </div>
            </div>

            <DataTable
              columns={goalColumns}
              data={filteredGoals}
              rowKey={(goal) => goal.id}
              isLoading={goalsQuery.isLoading}
              isError={goalsQuery.isError}
              onRetry={() => void goalsQuery.refetch()}
              emptyTitle={hasGoalFilters ? 'No goals match these filters' : 'No goals in this scope'}
              emptyDescription={
                hasGoalFilters
                  ? 'Try a different employee, status or category.'
                  : isEmployee
                    ? 'No goals have been set for this employee yet.'
                    : isManager
                      ? 'No goals are visible for your direct reports.'
                      : 'No goals have been created in this dataset.'
              }
              emptyAction={
                hasGoalFilters ? (
                  <Button variant="outline" size="sm" onClick={resetGoalFilters}>
                    <FilterX />
                    Clear filters
                  </Button>
                ) : canManageGoals && employeeOptions.length > 0 ? (
                  <Button size="sm" onClick={openCreateGoal}>
                    <Plus />
                    Create goal
                  </Button>
                ) : undefined
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Select value={reviewCycle} onValueChange={setReviewCycle}>
                  <SelectTrigger className="w-full sm:w-64" aria-label="Filter reviews by cycle">
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cycles</SelectItem>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger className="w-full sm:w-40" aria-label="Filter reviews by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {hasReviewFilters ? (
                  <Button variant="ghost" size="sm" onClick={resetReviewFilters}>
                    <FilterX />
                    Clear
                  </Button>
                ) : null}
              </div>
              {employeeOptions.length > 0 ? (
                <Button size="sm" onClick={openNewReview}>
                  <ClipboardCheck />
                  Submit review
                </Button>
              ) : null}
            </div>

            <DataTable
              columns={reviewColumns}
              data={filteredReviews}
              rowKey={(review) => review.id}
              isLoading={reviewsQuery.isLoading}
              isError={reviewsQuery.isError}
              onRetry={() => void reviewsQuery.refetch()}
              emptyTitle={hasReviewFilters ? 'No reviews match these filters' : 'No reviews in this scope'}
              emptyDescription={
                hasReviewFilters
                  ? 'Try a different cycle or status.'
                  : isManager
                    ? 'No reviews are visible for your direct reports.'
                    : 'Reviews will appear here once they are seeded or submitted.'
              }
              emptyAction={
                hasReviewFilters ? (
                  <Button variant="outline" size="sm" onClick={resetReviewFilters}>
                    <FilterX />
                    Clear filters
                  </Button>
                ) : employeeOptions.length > 0 ? (
                  <Button size="sm" onClick={openNewReview}>
                    <ClipboardCheck />
                    Submit review
                  </Button>
                ) : undefined
              }
            />
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Feedback</CardTitle>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {scopedFeedback.length} feedback record{scopedFeedback.length === 1 ? '' : 's'} in this scope
                </p>
              </div>
              {isHr || isManager ? (
                <Button size="sm" onClick={() => setFeedbackDialogOpen(true)} disabled={employeeOptions.length === 0}>
                  <MessageSquare />
                  Give feedback
                </Button>
              ) : null}
            </div>

            {scopedFeedback.length === 0 ? (
              <EmptyState
                title="No feedback in this scope"
                description={
                  isEmployee
                    ? 'Feedback shared with this employee will appear here.'
                    : 'Team feedback will appear here once it is submitted.'
                }
                icon={MessageSquare}
              />
            ) : (
              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                {scopedFeedback.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <EmployeeCell employeeId={item.employeeId} />
                      <Badge variant={FEEDBACK_VARIANTS[item.type]}>{item.type}</Badge>
                    </div>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-slate-600">{item.message}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 text-[11px] text-slate-400">
                      <span>
                        From <span className="font-medium text-slate-600">{getEmployeeName(item.fromId)}</span> ·{' '}
                        {formatDate(item.date)}
                      </span>
                      {item.rating ? <Rating value={item.rating} /> : <span>No rating</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <GoalFormDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        employees={employeeOptions}
        defaultEmployeeId={goalDefaultEmployee}
      />

      <ReviewFormDialog
        open={reviewDialog !== null}
        onOpenChange={(open) => !open && setReviewDialog(null)}
        employees={employeeOptions}
        allowedTypes={allowedReviewTypes}
        reviewerId={reviewerId}
        defaultEmployeeId={reviewDialog?.employeeId}
        defaultType={reviewDialog?.type}
        defaultRating={reviewDialog?.rating}
        defaultSummary={reviewDialog?.summary}
      />

      <FeedbackFormDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        employees={employeeOptions}
        fromId={reviewerId}
        defaultEmployeeId={employeeOptions[0]?.id}
      />
    </div>
  )
}
