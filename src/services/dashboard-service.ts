import { apiRequest } from '@/lib/api-client'
import type { DashboardOverview as DashboardOverviewPayload } from '@/lib/api-types'

/**
 * The dashboard is a single aggregated read model backed by SQL Server.
 */
export async function fetchDashboardOverview(): Promise<DashboardOverviewPayload> {
  return apiRequest<DashboardOverviewPayload>('/dashboard/overview')
}

export type DashboardOverview = DashboardOverviewPayload
