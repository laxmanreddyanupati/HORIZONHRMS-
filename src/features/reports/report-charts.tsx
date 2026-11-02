import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS } from '@/lib/constants'
import type { ReportDefinition } from '@/services/report-service'

type ReportRow = ReportDefinition['rows'][number]

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e5e9f0',
  boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)',
  fontSize: 12,
  padding: '8px 10px',
}

const axisTick = { fontSize: 10.5, fill: '#94a3b8' }
const legendStyle = { fontSize: 11, paddingTop: 6 }

const departmentLabels: Record<string, string> = {
  'Executive Office': 'Executive',
  Engineering: 'Engineering',
  Product: 'Product',
  Design: 'Design',
  'Human Resources': 'HR',
  Finance: 'Finance',
  Sales: 'Sales',
  Marketing: 'Marketing',
  'Customer Success': 'Customer Success',
  'IT Operations': 'IT Ops',
  'Legal & Compliance': 'Legal',
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function departmentRows(rows: ReportRow[]) {
  return rows.filter((row) => String(row.department) !== 'Total')
}

function shortDepartment(name: string): string {
  return departmentLabels[name] ?? name
}

export function HeadcountChart({ rows }: { rows: ReportRow[] }) {
  const data = departmentRows(rows).map((row) => ({
    department: shortDepartment(String(row.department)),
    Active: toNumber(row.active),
    Probation: toNumber(row.probation),
    'On leave': toNumber(row.onLeave),
    Inactive: toNumber(row.inactive),
  }))

  return (
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="department"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            interval={0}
            dy={8}
          />
          <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} allowDecimals={false} />
          <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
          <Bar dataKey="Active" stackId="headcount" name="Active" fill={CHART_COLORS[2]} />
          <Bar dataKey="Probation" stackId="headcount" name="Probation" fill={CHART_COLORS[3]} />
          <Bar dataKey="On leave" stackId="headcount" name="On leave" fill={CHART_COLORS[4]} />
          <Bar dataKey="Inactive" stackId="headcount" name="Inactive" fill={CHART_COLORS[6]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DepartmentChart({ rows }: { rows: ReportRow[] }) {
  const data = departmentRows(rows).map((row) => ({
    department: String(row.department),
    Employees: toNumber(row.headcount),
  }))

  return (
    <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="department"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            width={118}
          />
          <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Bar dataKey="Employees" name="Employees" barSize={16} radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.department} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AttendanceChart({ rows }: { rows: ReportRow[] }) {
  const data = departmentRows(rows).map((row) => ({
    department: shortDepartment(String(row.department)),
    Present: toNumber(row.present),
    Absent: toNumber(row.absent),
    Leave: toNumber(row.onLeave),
  }))

  return (
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="department"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            interval={0}
            dy={8}
          />
          <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} allowDecimals={false} />
          <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
          <Bar dataKey="Present" stackId="attendance" name="Present" fill={CHART_COLORS[2]} />
          <Bar dataKey="Leave" stackId="attendance" name="On leave" fill={CHART_COLORS[3]} />
          <Bar dataKey="Absent" stackId="attendance" name="Absent" fill={CHART_COLORS[5]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function LeaveChart({ rows }: { rows: ReportRow[] }) {
  const data = rows.map((row) => ({
    leaveType: String(row.leaveType),
    'Approved days': toNumber(row.days),
  }))

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 24 }} barSize={30}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="leaveType"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={54}
          />
          <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} allowDecimals={false} />
          <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Bar dataKey="Approved days" name="Approved days" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.leaveType} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
