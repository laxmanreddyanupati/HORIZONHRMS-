import type { LeaveApplicationInput, LeaveBalance, LeaveRequest, LeaveStatus } from '@/types'
import { leaveBalances, leavePolicies, leaveRequests, leaveTypes } from '@/data/leaves'
import { apiRequest } from '@/lib/api-client'

export interface LeaveFilters {
  status?: LeaveStatus | 'all'
  employeeId?: string
  managerId?: string
  leaveTypeId?: string
  search?: string
}

function upsertRequest(request: LeaveRequest): LeaveRequest {
  const index = leaveRequests.findIndex((item) => item.id === request.id)
  if (index >= 0) leaveRequests[index] = request
  else leaveRequests.unshift(request)
  return request
}

function replaceBalancesForEmployee(employeeId: string, balances: LeaveBalance[]): void {
  for (let index = leaveBalances.length - 1; index >= 0; index -= 1) {
    if (leaveBalances[index].employeeId === employeeId) leaveBalances.splice(index, 1)
  }
  leaveBalances.push(...balances)
}

function adjustBalance(employeeId: string, leaveTypeId: string, delta: { pending?: number; used?: number }): void {
  const balance = leaveBalances.find(
    (item) => item.employeeId === employeeId && item.leaveTypeId === leaveTypeId,
  )
  if (!balance) return
  if (delta.pending !== undefined) balance.pending = Math.max(0, balance.pending + delta.pending)
  if (delta.used !== undefined) balance.used = Math.max(0, Math.min(balance.allocated, balance.used + delta.used))
}

export async function fetchLeaveTypes() {
  const types = await apiRequest<typeof leaveTypes>('/leave/types')
  leaveTypes.splice(0, leaveTypes.length, ...types)
  return types
}

export async function fetchLeavePolicies() {
  const policies = await apiRequest<typeof leavePolicies>('/leave/policies')
  leavePolicies.splice(0, leavePolicies.length, ...policies)
  return policies
}

export async function fetchLeaveRequests(filters: LeaveFilters = {}): Promise<LeaveRequest[]> {
  const requests = await apiRequest<LeaveRequest[]>('/leave/requests', {
    query: {
      status: filters.status,
      employeeId: filters.employeeId,
      managerId: filters.managerId,
      leaveTypeId: filters.leaveTypeId,
      search: filters.search,
    },
  })

  requests.forEach(upsertRequest)
  return requests
}

export async function fetchLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  const balances = await apiRequest<LeaveBalance[]>(
    `/leave/balances/${encodeURIComponent(employeeId)}`,
  )
  replaceBalancesForEmployee(employeeId, balances)
  return balances
}

export async function fetchAllLeaveBalances(): Promise<LeaveBalance[]> {
  const balances = await apiRequest<LeaveBalance[]>('/leave/balances')
  leaveBalances.splice(0, leaveBalances.length, ...balances)
  return balances
}

export async function applyForLeave(input: LeaveApplicationInput): Promise<LeaveRequest> {
  const request = await apiRequest<LeaveRequest>('/leave/requests', {
    method: 'POST',
    body: {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason: input.reason,
    },
  })

  upsertRequest(request)
  adjustBalance(request.employeeId, request.leaveTypeId, { pending: request.days })
  return request
}

export async function decideLeaveRequest(
  id: string,
  status: Extract<LeaveStatus, 'Approved' | 'Rejected'>,
  note?: string,
): Promise<LeaveRequest> {
  const request = await apiRequest<LeaveRequest>(
    `/leave/requests/${encodeURIComponent(id)}/decision`,
    { method: 'POST', body: { status, note } },
  )

  upsertRequest(request)
  adjustBalance(request.employeeId, request.leaveTypeId, {
    pending: -request.days,
    used: status === 'Approved' ? request.days : 0,
  })
  return request
}

export async function cancelLeaveRequest(id: string, employeeId: string): Promise<LeaveRequest> {
  const request = await apiRequest<LeaveRequest>(
    `/leave/requests/${encodeURIComponent(id)}/cancel`,
    { method: 'POST', body: { employeeId } },
  )

  upsertRequest(request)
  adjustBalance(request.employeeId, request.leaveTypeId, { pending: -request.days })
  return request
}

export async function fetchLeaveSummary() {
  return apiRequest<{
    totalRequests: number
    pending: number
    approved: number
    rejected: number
    onLeaveToday: number
  }>('/leave/summary')
}
