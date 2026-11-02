import type {
  AttendanceCorrection,
  AttendanceRecord,
  AttendanceStatus,
  Holiday,
  Shift,
} from '@/types'
import { employees } from './employees'
import { isEmployeeOnLeave } from './leaves'
import { format } from 'date-fns'
import { DEMO_SNAPSHOT_DATE, mulberry32 } from '@/lib/utils'

export const shifts: Shift[] = [
  { id: 'shift-general', name: 'General Shift', startTime: '09:00', endTime: '18:00', graceMinutes: 15, assignedCount: 0, days: 'Monday – Friday' },
  { id: 'shift-flexible', name: 'Flexible Shift', startTime: '10:00', endTime: '19:00', graceMinutes: 30, assignedCount: 0, days: 'Monday – Friday' },
  { id: 'shift-early', name: 'Early Support', startTime: '07:30', endTime: '16:30', graceMinutes: 15, assignedCount: 0, days: 'Monday – Saturday' },
]

export const holidays: Holiday[] = [
  { id: 'HOL-01', name: "New Year's Day", date: '2026-01-01', type: 'Public' },
  { id: 'HOL-02', name: 'Makar Sankranti', date: '2026-01-15', type: 'Optional' },
  { id: 'HOL-03', name: 'Republic Day', date: '2026-01-26', type: 'Public' },
  { id: 'HOL-04', name: 'Holi', date: '2026-03-04', type: 'Public' },
  { id: 'HOL-05', name: 'Eid-ul-Fitr', date: '2026-03-21', type: 'Optional' },
  { id: 'HOL-06', name: 'Good Friday', date: '2026-04-03', type: 'Optional' },
  { id: 'HOL-07', name: 'Tamil New Year', date: '2026-04-14', type: 'Optional' },
  { id: 'HOL-08', name: 'May Day', date: '2026-05-01', type: 'Public' },
  { id: 'HOL-09', name: 'Horizon Foundation Day', date: '2026-06-19', type: 'Company' },
  { id: 'HOL-10', name: 'Independence Day', date: '2026-08-15', type: 'Public' },
  { id: 'HOL-11', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'Public' },
  { id: 'HOL-12', name: 'Dussehra', date: '2026-10-20', type: 'Public' },
  { id: 'HOL-13', name: 'Diwali', date: '2026-11-08', type: 'Public' },
  { id: 'HOL-14', name: 'Christmas Day', date: '2026-12-25', type: 'Public' },
  { id: 'HOL-15', name: 'Year-end Shutdown', date: '2026-12-31', type: 'Company' },
  { id: 'HOL-16', name: "New Year's Day", date: '2027-01-01', type: 'Public' },
  { id: 'HOL-17', name: 'Republic Day', date: '2027-01-26', type: 'Public' },
  { id: 'HOL-18', name: 'Holi', date: '2027-03-22', type: 'Public' },
]

const holidayDates = new Map(holidays.map((h) => [h.date, h]))

export function getHoliday(date: string): Holiday | undefined {
  return holidays.find((holiday) => holiday.date === date)
}

const shiftAssignment = new Map<string, string>()
employees.forEach((employee, index) => {
  const shiftId = index % 17 === 0 ? 'shift-early' : employee.shiftId
  shiftAssignment.set(employee.id, shiftId)
  const shift = shifts.find((s) => s.id === shiftId)
  if (shift) shift.assignedCount += 1
})

function timeFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function generateRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = []
  const start = new Date(2026, 7, 3)
  const end = DEMO_SNAPSHOT_DATE
  const dates: Date[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d))
  }

  employees.forEach((employee, empIndex) => {
    if (employee.status === 'Inactive') return
    const shiftId = shiftAssignment.get(employee.id) ?? 'shift-general'
    const shift = shifts.find((s) => s.id === shiftId) ?? shifts[0]
    const [startHour, startMinute] = shift.startTime.split(':').map(Number)
    const shiftStart = startHour * 60 + startMinute

    dates.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const day = date.getDay()
      let status: AttendanceStatus = 'Present'
      let checkIn: string | null = null
      let checkOut: string | null = null
      let workedHours: number | null = null
      let note: string | undefined

      if (day === 0 || day === 6) {
        status = 'Weekend'
      } else if (holidayDates.has(dateStr)) {
        status = 'Holiday'
      } else if (isEmployeeOnLeave(employee.id, dateStr)) {
        status = 'On Leave'
      } else {
        const rand = mulberry32(empIndex * 7919 + date.getDate() * 131 + date.getMonth() * 977)()
        if (rand < 0.035) {
          status = 'Absent'
          note = 'No attendance recorded'
        } else if (rand < 0.075) {
          status = 'Late'
          const minutes = shiftStart + 45 + Math.floor(rand * 400) % 40
          checkIn = timeFromMinutes(minutes)
          checkOut = timeFromMinutes(minutes + 480 + (Math.floor(rand * 100) % 40))
          workedHours = Number(((minutes + 480 - minutes) / 60).toFixed(1))
        } else if (rand < 0.095) {
          status = 'Half Day'
          const minutes = shiftStart + Math.floor(rand * 20)
          checkIn = timeFromMinutes(minutes)
          checkOut = timeFromMinutes(minutes + 240)
          workedHours = 4
        } else {
          const offset = Math.floor(rand * 100) % 26
          const minutes = shiftStart - 12 + offset
          checkIn = timeFromMinutes(minutes)
          const work = 485 + (Math.floor(rand * 100) % 45)
          checkOut = timeFromMinutes(minutes + work)
          workedHours = Number((work / 60).toFixed(1))
        }
      }

      records.push({
        id: `ATT-${employee.id}-${dateStr}`,
        employeeId: employee.id,
        date: dateStr,
        checkIn,
        checkOut,
        status,
        workedHours,
        shiftId,
        note,
      })
    })
  })

  return records
}

export const attendanceRecords: AttendanceRecord[] = generateRecords()

export const attendanceCorrections: AttendanceCorrection[] = [
  {
    id: 'ACR-1001',
    employeeId: 'HZT-0018',
    date: '2026-10-27',
    currentStatus: 'Absent',
    requestedStatus: 'Present',
    reason: 'Biometric device at the Bengaluru office was offline. I was present and completed a full day.',
    requestedOn: '2026-10-28',
    status: 'Pending',
  },
  {
    id: 'ACR-1002',
    employeeId: 'HZT-0042',
    date: '2026-10-23',
    currentStatus: 'Late',
    requestedStatus: 'Present',
    reason: 'Cab delay due to a road closure. Check-in was recorded at 09:52.',
    requestedOn: '2026-10-24',
    status: 'Pending',
  },
  {
    id: 'ACR-1003',
    employeeId: 'HZT-0067',
    date: '2026-10-21',
    currentStatus: 'Half Day',
    requestedStatus: 'Present',
    reason: 'Approved half day was cancelled. I returned to work after lunch.',
    requestedOn: '2026-10-22',
    status: 'Approved',
  },
  {
    id: 'ACR-1004',
    employeeId: 'HZT-0094',
    date: '2026-10-15',
    currentStatus: 'Absent',
    requestedStatus: 'On Leave',
    reason: 'Approved sick leave was not reflected in attendance.',
    requestedOn: '2026-10-16',
    status: 'Approved',
  },
  {
    id: 'ACR-1005',
    employeeId: 'HZT-0112',
    date: '2026-10-09',
    currentStatus: 'Late',
    requestedStatus: 'Present',
    reason: 'Client call ran late the previous night; shift timings were adjusted by the manager.',
    requestedOn: '2026-10-10',
    status: 'Rejected',
  },
  {
    id: 'ACR-1006',
    employeeId: 'HZT-0037',
    date: '2026-10-28',
    currentStatus: 'Absent',
    requestedStatus: 'Present',
    reason: 'Forgot to tap out; access logs confirm presence.',
    requestedOn: '2026-10-29',
    status: 'Pending',
  },
]

export function getFilteredAttendance(date: string): AttendanceRecord[] {
  return attendanceRecords.filter((record) => record.date === date)
}

export function getEmployeeAttendance(employeeId: string, month: number, year: number): AttendanceRecord[] {
  return attendanceRecords.filter((record) => {
    const d = new Date(record.date)
    return record.employeeId === employeeId && d.getMonth() === month && d.getFullYear() === year
  })
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  halfDay: number
  onLeave: number
  notMarked: number
  total: number
  rate: number
}

export function getAttendanceSummary(date: string): AttendanceSummary {
  const records = getFilteredAttendance(date)
  const active = employees.filter((e) => e.status !== 'Inactive')
  const present = records.filter((r) => r.status === 'Present').length
  const late = records.filter((r) => r.status === 'Late').length
  const halfDay = records.filter((r) => r.status === 'Half Day').length
  const onLeave = records.filter((r) => r.status === 'On Leave').length
  const absent = records.filter((r) => r.status === 'Absent').length
  const total = active.length
  const accounted = present + late + halfDay + onLeave + absent
  return {
    present,
    absent,
    late,
    halfDay,
    onLeave,
    notMarked: Math.max(0, total - accounted),
    total,
    rate: total === 0 ? 0 : Math.round(((present + late + halfDay) / total) * 1000) / 10,
  }
}

export function getAttendanceTrend(days = 7): Array<{ date: string; present: number; absent: number; onLeave: number }> {
  const result: Array<{ date: string; present: number; absent: number; onLeave: number }> = []
  const holidayDateSet = new Set(holidays.map((holiday) => holiday.date))
  const cursor = new Date(DEMO_SNAPSHOT_DATE)
  let added = 0
  while (added < days) {
    const day = cursor.getDay()
    const dateStr = format(cursor, 'yyyy-MM-dd')
    if (day !== 0 && day !== 6 && !holidayDateSet.has(dateStr)) {
      const records = getFilteredAttendance(dateStr)
      result.unshift({
        date: dateStr,
        present: records.filter((r) => r.status === 'Present' || r.status === 'Late' || r.status === 'Half Day').length,
        absent: records.filter((r) => r.status === 'Absent').length,
        onLeave: records.filter((r) => r.status === 'On Leave').length,
      })
      added += 1
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return result
}
