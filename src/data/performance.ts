import type { AppraisalCycle, Feedback, Goal, Review } from '@/types'
import { employees } from './employees'
import { format } from 'date-fns'

export const appraisalCycles: AppraisalCycle[] = [
  {
    id: 'CYC-2026-H1',
    name: 'H1 2026 Performance Review',
    period: 'Apr 2026 – Sep 2026',
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    status: 'Completed',
  },
  {
    id: 'CYC-2026-H2',
    name: 'H2 2026 Performance Review',
    period: 'Oct 2026 – Mar 2027',
    startDate: '2026-10-01',
    endDate: '2027-03-31',
    status: 'Active',
  },
  {
    id: 'CYC-2027-H1',
    name: 'H1 2027 Performance Review',
    period: 'Apr 2027 – Sep 2027',
    startDate: '2027-04-01',
    endDate: '2027-09-30',
    status: 'Draft',
  },
]

const goalTemplates: Array<{ title: string; description: string; category: string; target: string }> = [
  { title: 'Deliver quarterly roadmap commitments', description: 'Ship all committed roadmap milestones for the active quarter with agreed quality gates.', category: 'Delivery', target: '100% of committed milestones' },
  { title: 'Improve customer satisfaction score', description: 'Increase the account-level CSAT through proactive engagement and faster resolution.', category: 'Customer', target: 'CSAT ≥ 4.5 / 5' },
  { title: 'Reduce release cycle time', description: 'Shorten the median time from code complete to production using pipeline improvements.', category: 'Engineering', target: 'Median ≤ 3 days' },
  { title: 'Complete certification or learning path', description: 'Finish the agreed professional certification and share learnings with the team.', category: 'Learning', target: 'Certification completed' },
  { title: 'Mentor two team members', description: 'Run structured mentoring with clear development plans and monthly check-ins.', category: 'People', target: '2 mentees with documented plans' },
  { title: 'Improve process documentation coverage', description: 'Document critical workflows and ensure the team can operate without key-person dependency.', category: 'Process', target: 'All critical flows documented' },
  { title: 'Drive cost optimisation initiative', description: 'Identify and implement measurable savings within the assigned function.', category: 'Business', target: '₹5L annualised savings' },
  { title: 'Increase qualified pipeline', description: 'Build a healthy top-of-funnel pipeline for the assigned territory and segment.', category: 'Revenue', target: '₹4Cr qualified pipeline' },
]

const goalStatuses: Goal['status'][] = ['On Track', 'On Track', 'Completed', 'At Risk', 'Not Started', 'On Track']

export const goals: Goal[] = employees.flatMap((employee, employeeIndex) => {
  if (employeeIndex >= 40) return []
  const count = 2 + (employeeIndex % 3)
  return Array.from({ length: count }, (_, goalIndex) => {
    const template = goalTemplates[(employeeIndex + goalIndex) % goalTemplates.length]
    const progress = [25, 45, 60, 75, 90, 100][(employeeIndex + goalIndex * 2) % 6]
    return {
      id: `GOAL-${employee.id}-${goalIndex + 1}`,
      employeeId: employee.id,
      title: template.title,
      description: template.description,
      category: template.category,
      weight: count === 2 ? 50 : goalIndex === 0 ? 40 : 30,
      target: template.target,
      progress,
      dueDate: `2027-03-31`,
      status: progress === 100 ? 'Completed' : goalStatuses[(employeeIndex + goalIndex) % goalStatuses.length],
    }
  })
})

const reviewSummaries = [
  'Consistently delivers high-quality work and is a strong collaborator across teams.',
  'Exceeded delivery targets this cycle. Next focus area is broader stakeholder communication.',
  'Solid technical contribution with visible growth in ownership. Continue building mentoring capability.',
  'Reliable execution and strong customer empathy. Recommend increasing scope in the next cycle.',
  'Strong people leadership and clear prioritisation. Continue improving cross-functional planning.',
  'Good progress on individual goals. Recommend sharper focus on measurable outcomes next cycle.',
]

export const reviews: Review[] = employees.slice(0, 24).flatMap((employee, index) => {
  const selfStatus: Review['status'] = index % 4 === 0 ? 'Pending' : 'Completed'
  const managerStatus: Review['status'] = index % 3 === 0 ? 'In Progress' : 'Completed'
  return [
    {
      id: `REV-SELF-${employee.id}`,
      employeeId: employee.id,
      cycleId: 'CYC-2026-H2',
      reviewerId: employee.id,
      type: 'Self',
      rating: 3 + (index % 3),
      status: selfStatus,
      submittedOn: selfStatus === 'Completed' ? '2026-10-24' : undefined,
      summary: selfStatus === 'Completed' ? 'Shared progress against goals and areas where I would like more support.' : undefined,
    },
    {
      id: `REV-MGR-${employee.id}`,
      employeeId: employee.id,
      cycleId: 'CYC-2026-H2',
      reviewerId: employee.managerId ?? 'HZT-0001',
      type: 'Manager',
      rating: 3 + ((index + 1) % 3),
      status: managerStatus,
      submittedOn: managerStatus === 'Completed' ? '2026-10-27' : undefined,
      summary: managerStatus === 'Completed' ? reviewSummaries[index % reviewSummaries.length] : undefined,
    },
  ]
})

export const feedback: Feedback[] = [
  {
    id: 'FB-4001',
    employeeId: 'HZT-0005',
    fromId: 'HZT-0003',
    date: '2026-10-24',
    type: 'Praise',
    message: 'Great work leading the accessibility audit. The resulting fixes were shipped ahead of schedule and improved the platform for every customer.',
    rating: 5,
  },
  {
    id: 'FB-4002',
    employeeId: 'HZT-0006',
    fromId: 'HZT-0002',
    date: '2026-10-21',
    type: 'Praise',
    message: 'The October onboarding cohort was one of our smoothest yet. Clear communication with every stakeholder involved.',
    rating: 5,
  },
  {
    id: 'FB-4003',
    employeeId: 'HZT-0004',
    fromId: 'HZT-0001',
    date: '2026-10-18',
    type: 'Check-in',
    message: 'Let us review the design system roadmap next week and align on the Q3 priorities.',
  },
  {
    id: 'FB-4004',
    employeeId: 'HZT-0018',
    fromId: 'HZT-0003',
    date: '2026-10-15',
    type: 'Constructive',
    message: 'Good progress on the API migration. Please include rollout risks earlier in the design review so the team can plan dependencies.',
    rating: 3,
  },
  {
    id: 'FB-4005',
    employeeId: 'HZT-0094',
    fromId: 'HZT-0009',
    date: '2026-10-12',
    type: 'Praise',
    message: 'Excellent recovery on the enterprise renewal conversation. The customer specifically called out your preparation and follow-through.',
    rating: 5,
  },
  {
    id: 'FB-4006',
    employeeId: 'HZT-0051',
    fromId: 'HZT-0003',
    date: '2026-10-08',
    type: 'Check-in',
    message: 'Monthly product-engineering sync is working well. Let us add a short customer signal review to the agenda.',
  },
  {
    id: 'FB-4007',
    employeeId: 'HZT-0022',
    fromId: 'HZT-0004',
    date: '2026-10-04',
    type: 'Constructive',
    message: 'Strong visual craft. Tighten the handoff notes so engineering can estimate without additional clarification cycles.',
    rating: 3,
  },
]

export function getGoalsForEmployee(employeeId: string): Goal[] {
  return goals.filter((goal) => goal.employeeId === employeeId)
}

export function getReviewsForEmployee(employeeId: string): Review[] {
  return reviews.filter((review) => review.employeeId === employeeId)
}

export function getCycleById(id: string): AppraisalCycle | undefined {
  return appraisalCycles.find((cycle) => cycle.id === id)
}

export const currentCycle = appraisalCycles[1]

export function formatCycleDate(date: string) {
  return format(new Date(date), 'dd MMM yyyy')
}
