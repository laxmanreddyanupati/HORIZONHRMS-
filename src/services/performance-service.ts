import type { AppraisalCycle, Feedback, Goal, GoalFormInput, Review, ReviewType } from '@/types'
import { appraisalCycles, feedback, goals, reviews } from '@/data/performance'
import { apiRequest } from '@/lib/api-client'

function upsertGoal(goal: Goal): Goal {
  const index = goals.findIndex((item) => item.id === goal.id)
  if (index >= 0) goals[index] = goal
  else goals.unshift(goal)
  return goal
}

function upsertCycle(cycle: AppraisalCycle): AppraisalCycle {
  const index = appraisalCycles.findIndex((item) => item.id === cycle.id)
  if (index >= 0) appraisalCycles[index] = cycle
  else appraisalCycles.unshift(cycle)
  return cycle
}

function upsertReview(review: Review): Review {
  const index = reviews.findIndex((item) => item.id === review.id)
  if (index >= 0) reviews[index] = review
  else reviews.push(review)
  return review
}

function upsertFeedback(item: Feedback): Feedback {
  const index = feedback.findIndex((entry) => entry.id === item.id)
  if (index >= 0) feedback[index] = item
  else feedback.unshift(item)
  return item
}

export async function fetchCycles(): Promise<AppraisalCycle[]> {
  const cycles = await apiRequest<AppraisalCycle[]>('/performance/cycles')
  cycles.forEach(upsertCycle)
  return cycles
}

export async function fetchGoals(employeeId?: string): Promise<Goal[]> {
  const fetched = await apiRequest<Goal[]>('/performance/goals', { query: { employeeId } })
  fetched.forEach(upsertGoal)
  return fetched
}

export async function createGoal(input: GoalFormInput): Promise<Goal> {
  const goal = await apiRequest<Goal>('/performance/goals', {
    method: 'POST',
    body: {
      employeeId: input.employeeId,
      title: input.title,
      description: input.description,
      category: input.category,
      target: input.target,
      weight: input.weight,
      dueDate: input.dueDate,
    },
  })
  return upsertGoal(goal)
}

export async function updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
  const goal = await apiRequest<Goal>(`/performance/goals/${encodeURIComponent(goalId)}/progress`, {
    method: 'PATCH',
    body: { progress },
  })
  return upsertGoal(goal)
}

export async function fetchReviews(
  filters: { employeeId?: string; cycleId?: string; status?: Review['status'] | 'all' } = {},
): Promise<Review[]> {
  const fetched = await apiRequest<Review[]>('/performance/reviews', {
    query: {
      employeeId: filters.employeeId,
      cycleId: filters.cycleId,
      status: filters.status,
    },
  })
  fetched.forEach(upsertReview)
  return fetched
}

export async function submitReview(input: {
  employeeId: string
  reviewerId: string
  type: ReviewType
  rating: number
  summary: string
}): Promise<Review> {
  const review = await apiRequest<Review>('/performance/reviews', {
    method: 'POST',
    body: {
      employeeId: input.employeeId,
      reviewerId: input.reviewerId,
      type: input.type,
      rating: input.rating,
      summary: input.summary,
    },
  })
  return upsertReview(review)
}

export async function fetchFeedback(employeeId?: string): Promise<Feedback[]> {
  const fetched = await apiRequest<Feedback[]>('/performance/feedback', { query: { employeeId } })
  fetched.forEach(upsertFeedback)
  return fetched
}

export async function submitFeedback(input: {
  employeeId: string
  fromId: string
  type: Feedback['type']
  message: string
  rating?: number
}): Promise<Feedback> {
  const item = await apiRequest<Feedback>('/performance/feedback', {
    method: 'POST',
    body: {
      employeeId: input.employeeId,
      fromId: input.fromId,
      type: input.type,
      message: input.message,
      rating: input.rating,
    },
  })
  return upsertFeedback(item)
}

export async function fetchPerformanceSummary() {
  return apiRequest<{
    totalGoals: number
    onTrack: number
    atRisk: number
    completed: number
    pendingReviews: number
    completedReviews: number
    averageRating: number
  }>('/performance/summary')
}
