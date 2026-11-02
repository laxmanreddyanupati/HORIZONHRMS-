import { apiRequest } from '@/lib/api-client'

export type ReportId =
  | 'headcount'
  | 'department'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'recruitment'

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'right'
}

export interface ReportDefinition {
  id: ReportId
  title: string
  description: string
  columns: ReportColumn[]
  rows: Array<Record<string, string | number>>
  summary: Array<{ label: string; value: string }>
  notice?: string
}

interface ReportPayload {
  id: string
  title: string
  description: string
  columns: Array<{ key: string; label: string; align?: string | null }>
  rows: Array<Record<string, string | number>>
  summary: Array<{ label: string; value: string }>
  notice?: string | null
}

function normalize(report: ReportPayload): ReportDefinition {
  return {
    id: report.id as ReportId,
    title: report.title,
    description: report.description,
    columns: report.columns.map((column) => ({
      key: column.key,
      label: column.label,
      align: column.align === 'left' || column.align === 'right' ? column.align : undefined,
    })),
    rows: report.rows,
    summary: report.summary,
    notice: report.notice ?? undefined,
  }
}

export async function fetchReport(id: ReportId): Promise<ReportDefinition> {
  const report = await apiRequest<ReportPayload>(`/reports/${encodeURIComponent(id)}`)
  return normalize(report)
}

export async function fetchAllReports(): Promise<ReportDefinition[]> {
  const reports = await apiRequest<ReportPayload[]>('/reports')
  return reports.map(normalize)
}
