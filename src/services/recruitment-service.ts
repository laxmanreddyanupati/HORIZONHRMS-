import type { Candidate, Interview, JobFormInput, JobOpening } from '@/types'
import { candidates, interviews, jobOpenings } from '@/data/recruitment'
import { apiRequest } from '@/lib/api-client'

export interface CandidateFilters {
  jobId?: string
  stage?: Candidate['stage'] | 'all'
  search?: string
}

function upsertJob(job: JobOpening): JobOpening {
  const index = jobOpenings.findIndex((item) => item.id === job.id)
  if (index >= 0) jobOpenings[index] = job
  else jobOpenings.unshift(job)
  return job
}

function upsertCandidate(candidate: Candidate): Candidate {
  const index = candidates.findIndex((item) => item.id === candidate.id)
  if (index >= 0) candidates[index] = candidate
  else candidates.unshift(candidate)
  return candidate
}

function upsertInterview(interview: Interview): Interview {
  const index = interviews.findIndex((item) => item.id === interview.id)
  if (index >= 0) interviews[index] = interview
  else interviews.push(interview)
  return interview
}

export async function fetchJobs(): Promise<JobOpening[]> {
  const jobs = await apiRequest<JobOpening[]>('/recruitment/jobs')
  jobOpenings.splice(0, jobOpenings.length, ...jobs)
  return jobs
}

export async function fetchJob(id: string): Promise<JobOpening> {
  const job = await apiRequest<JobOpening>(`/recruitment/jobs/${encodeURIComponent(id)}`)
  upsertJob(job)
  return job
}

export async function createJob(input: JobFormInput): Promise<JobOpening> {
  const job = await apiRequest<JobOpening>('/recruitment/jobs', {
    method: 'POST',
    body: {
      title: input.title,
      departmentId: input.departmentId,
      location: input.location,
      employmentType: input.employmentType,
      experienceMin: input.experienceMin,
      experienceMax: input.experienceMax,
      openings: input.openings,
      salaryRange: input.salaryRange,
      description: input.description,
      skills: [],
    },
  })
  upsertJob(job)
  return job
}

export async function updateJobStatus(id: string, status: JobOpening['status']): Promise<JobOpening> {
  const job = await apiRequest<JobOpening>(`/recruitment/jobs/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
  })
  upsertJob(job)
  return job
}

export async function updateJob(id: string, input: Partial<JobFormInput>): Promise<JobOpening> {
  const existing = jobOpenings.find((item) => item.id === id) ?? (await fetchJob(id))

  // The backend PUT replaces the editable fields, so merge with the current
  // record rather than sending a sparse payload that would fail validation.
  const merged: JobFormInput = {
    title: input.title ?? existing.title,
    departmentId: input.departmentId ?? existing.departmentId,
    location: input.location ?? existing.location,
    employmentType: input.employmentType ?? existing.employmentType,
    experienceMin: input.experienceMin ?? existing.experienceMin,
    experienceMax: input.experienceMax ?? existing.experienceMax,
    openings: input.openings ?? existing.openings,
    salaryRange: input.salaryRange ?? existing.salaryRange,
    description: input.description ?? existing.description,
  }

  const job = await apiRequest<JobOpening>(`/recruitment/jobs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: {
      ...merged,
      status: existing.status,
      hiringManagerId: existing.hiringManagerId,
      skills: existing.skills,
    },
  })
  upsertJob(job)
  return job
}

export async function fetchCandidates(filters: CandidateFilters = {}): Promise<Candidate[]> {
  const fetched = await apiRequest<Candidate[]>('/recruitment/candidates', {
    query: {
      jobId: filters.jobId,
      stage: filters.stage,
      search: filters.search,
    },
  })
  fetched.forEach(upsertCandidate)
  return fetched
}

export async function moveCandidate(candidateId: string, stage: Candidate['stage']): Promise<Candidate> {
  return updateCandidate(candidateId, { stage })
}

export async function updateCandidate(
  candidateId: string,
  input: Partial<Pick<Candidate, 'stage' | 'rating' | 'notes'>>,
): Promise<Candidate> {
  const candidate = await apiRequest<Candidate>(`/recruitment/candidates/${encodeURIComponent(candidateId)}`, {
    method: 'PATCH',
    body: {
      stage: input.stage,
      rating: input.rating,
      notes: input.notes ?? undefined,
    },
  })
  upsertCandidate(candidate)
  return candidate
}

export async function fetchInterviews(): Promise<Interview[]> {
  const list = await apiRequest<Interview[]>('/recruitment/interviews')
  list.forEach(upsertInterview)
  return list
}

export async function scheduleInterview(input: {
  candidateId: string
  round: string
  date: string
  time: string
  mode: Interview['mode']
  interviewer: string
}): Promise<Interview> {
  const interview = await apiRequest<Interview>('/recruitment/interviews', {
    method: 'POST',
    body: {
      candidateId: input.candidateId,
      round: input.round,
      date: input.date,
      time: input.time,
      mode: input.mode,
      interviewer: input.interviewer,
      status: 'Scheduled',
    },
  })
  upsertInterview(interview)
  // Candidate stage may be updated by backend; refresh candidates list if needed by caller
  return interview
}

export async function updateInterview(
  id: string,
  input: Partial<Pick<Interview, 'status' | 'feedback' | 'date' | 'time' | 'interviewer'>>,
): Promise<Interview> {
  const interview = await apiRequest<Interview>(`/recruitment/interviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: {
      status: input.status,
      feedback: input.feedback ?? undefined,
      date: input.date,
      time: input.time,
      interviewer: input.interviewer,
    },
  })
  upsertInterview(interview)
  return interview
}

export async function fetchRecruitmentSummary() {
  const summary = await apiRequest<{
    openJobs: number
    openPositions: number
    candidates: number
    interviewsScheduled: number
    offers: number
    hired: number
    pipeline: Array<{ stage: Candidate['stage']; count: number }>
  }>('/recruitment/summary')
  return summary
}
