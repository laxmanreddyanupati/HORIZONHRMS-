import type { AttendanceCorrection, AttendanceRecord, AttendanceStatus, Employee, Holiday } from '@/types'
import {
  attendanceCorrections,
  attendanceRecords,
  holidays,
  shifts,
} from '@/data/attendance'
import { apiRequest } from '@/lib/api-client'
import { DEMO_SNAPSHOT_DATE } from '@/lib/utils'
import { format } from 'date-fns'

export const ATTENDANCE_SNAPSHOT = format(DEMO_SNAPSHOT_DATE, 'yyyy-MM-dd')

export interface AttendanceRow extends AttendanceRecord {
  employee: Employee
}

type AttendanceRecordDto = AttendanceRecord & { employee?: Employee | null }

export interface DailyAttendanceFilters {
  date: string
  departmentId?: string
  status?: AttendanceStatus | 'all'
  search?: string
  managerId?: string
}

function upsertRecord(record: AttendanceRecord): AttendanceRecord {
  const index = attendanceRecords.findIndex((item) => item.id === record.id)
  if (index >= 0) attendanceRecords[index] = record
  else attendanceRecords.push(record)
  return record
}

function upsertCorrection(correction: AttendanceCorrection): AttendanceCorrection {
  const index = attendanceCorrections.findIndex((item) => item.id === correction.id)
  if (index >= 0) attendanceCorrections[index] = correction
  else attendanceCorrections.unshift(correction)
  return correction
}

export async function fetchDailyAttendance(filters: DailyAttendanceFilters): Promise<AttendanceRow[]> {
  const rows = await apiRequest<AttendanceRecordDto[]>('/attendance/daily', {
    query: {
      date: filters.date,
      departmentId: filters.departmentId,
      status: filters.status,
      search: filters.search,
      managerId: filters.managerId,
    },
  })

  return rows
    .filter((row): row is AttendanceRecordDto & { employee: Employee } => Boolean(row.employee))
    .map((row) => {
      const { employee, ...record } = row
      upsertRecord(record)
      return { ...record, employee }
    })
}

export async function fetchAttendanceSummary(date = ATTENDANCE_SNAPSHOT) {
  return apiRequest<{
    date: string
    present: number
    absent: number
    late: number
    halfDay: number
    onLeave: number
    notMarked: number
    total: number
    rate: number
  }>('/attendance/summary', { query: { date } })
}

export async function fetchEmployeeAttendance(employeeId: string, month: number, year: number): Promise<AttendanceRecord[]> {
  const records = await apiRequest<AttendanceRecord[]>(
    `/attendance/employee/${encodeURIComponent(employeeId)}`,
    { query: { month, year } },
  )
  records.forEach(upsertRecord)
  return records
}

export async function fetchTodayRecord(employeeId: string): Promise<AttendanceRecord | undefined> {
  const record = await apiRequest<AttendanceRecord | null>(
    `/attendance/today/${encodeURIComponent(employeeId)}`,
  )
  return record ? upsertRecord(record) : undefined
}

export async function simulateCheckIn(employeeId: string): Promise<AttendanceRecord> {
  const record = await apiRequest<AttendanceRecord>('/attendance/check-in', {
    method: 'POST',
    body: { employeeId },
  })
  return upsertRecord(record)
}

export async function simulateCheckOut(employeeId: string): Promise<AttendanceRecord> {
  const record = await apiRequest<AttendanceRecord>('/attendance/check-out', {
    method: 'POST',
    body: { employeeId },
  })
  return upsertRecord(record)
}

export interface CorrectionFilters {
  status?: AttendanceCorrection['status'] | 'all'
  managerId?: string
}

export async function fetchCorrections(filters: CorrectionFilters = {}): Promise<AttendanceCorrection[]> {
  const corrections = await apiRequest<AttendanceCorrection[]>('/attendance/corrections', {
    query: { status: filters.status, managerId: filters.managerId },
  })
  if (!filters.status || filters.status === 'all') {
    if (!filters.managerId) {
      attendanceCorrections.splice(0, attendanceCorrections.length, ...corrections)
    }
  }
  return corrections
}

export async function submitCorrection(input: {
  employeeId: string
  date: string
  requestedStatus: AttendanceStatus
  reason: string
}): Promise<AttendanceCorrection> {
  const correction = await apiRequest<AttendanceCorrection>('/attendance/corrections', {
    method: 'POST',
    body: input,
  })
  return upsertCorrection(correction)
}

export async function decideCorrection(
  id: string,
  decision: 'Approved' | 'Rejected',
  note?: string,
): Promise<AttendanceCorrection> {
  const correction = await apiRequest<AttendanceCorrection>(
    `/attendance/corrections/${encodeURIComponent(id)}/decision`,
    { method: 'POST', body: { status: decision, note } },
  )
  upsertCorrection(correction)

  if (decision === 'Approved') {
    const record = attendanceRecords.find(
      (item) => item.employeeId === correction.employeeId && item.date === correction.date,
    )
    if (record) {
      record.status = correction.requestedStatus
      record.note = 'Updated through an approved attendance correction.'
    }
  }
  return correction
}

export async function fetchShifts() {
  const result = await apiRequest<typeof shifts>('/attendance/shifts')
  shifts.splice(0, shifts.length, ...result)
  return result
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const result = await apiRequest<Holiday[]>('/attendance/holidays')
  holidays.splice(0, holidays.length, ...result.sort((a, b) => a.date.localeCompare(b.date)))
  return [...holidays]
}

export async function fetchHolidayForDate(date: string): Promise<Holiday | undefined> {
  const holiday = await apiRequest<Holiday | null>(`/attendance/holidays/${encodeURIComponent(date)}`)
  return holiday ?? undefined
}
