import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Cake,
  CalendarCheck2,
  CalendarDays,
  ClipboardCheck,
  Gift,
  PartyPopper,
  ReceiptText,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AvatarName } from '@/components/common/avatar-name'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/contexts/role-context'
import { fetchDashboardOverview } from '@/services'
import { QUICK_LINKS } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e5e9f0',
  boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)',
  fontSize: 12,
  padding: '8px 10px',
}

const quickActionIcons = {
  '/employees/new': UserPlus,
  '/leave?action=apply': CalendarDays,
  '/payroll?tab=preview': Wallet,
  '/recruitment?action=new-job': Briefcase,
  '/expenses?action=new': ReceiptText,
} as const

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-white p-5 shadow-card">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { persona, roleLabel, canAccess, canViewSensitive } = useRole()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardOverview,
  })

  const firstName = persona.name.split(' ')[0]
  const quickLinks = QUICK_LINKS.filter((link) => {
    if (link.href.startsWith('/employees')) return canAccess('employees')
    if (link.href.startsWith('/leave')) return canAccess('leave')
    if (link.href.startsWith('/payroll')) return canAccess('payroll') && canViewSensitive
    if (link.href.startsWith('/recruitment')) return canAccess('recruitment')
    if (link.href.startsWith('/expenses')) return canAccess('expenses')
    return false
  }).slice(0, 4)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={data ? `Snapshot · ${formatDate(data.snapshot, 'EEEE, dd MMMM yyyy')}` : 'Loading snapshot'}
        title={`Welcome back, ${firstName}`}
        description={`You are viewing the ${roleLabel} experience. Here is what is happening across ${'Horizon Technologies'} today.`}
        actions={
          <>
            {canAccess('reports') ? (
              <Button variant="outline" asChild>
                <Link to="/reports">
                  <BarChart3 />
                  View reports
                </Link>
              </Button>
            ) : null}
            {canAccess('employees') ? (
              <Button asChild>
                <Link to="/employees/new">
                  <UserPlus />
                  Add employee
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/leave?action=apply">
                  <CalendarDays />
                  Apply for leave
                </Link>
              </Button>
            )}
          </>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total employees"
              value={data.stats.totalEmployees}
              icon={Users}
              hint={`${data.stats.activeEmployees} active`}
              trend={{ value: `+${data.stats.newHiresThisMonth} this month`, direction: 'up' }}
            />
            <StatCard
              label="Present today"
              value={data.stats.presentToday}
              icon={UserCheck}
              hint={`${data.stats.onLeaveToday} on leave`}
              trend={{ value: `${data.stats.attendanceRate}% attendance`, direction: 'up' }}
              iconClassName="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Pending approvals"
              value={data.stats.pendingLeaveRequests}
              icon={ClipboardCheck}
              hint={`${data.pendingExpenses} expense claims pending`}
              iconClassName="bg-amber-50 text-amber-600"
            />
            {canViewSensitive ? (
              <StatCard
                label={`Payroll · ${data.stats.payrollMonthLabel}`}
                value={formatCurrency(data.stats.monthlyPayroll, true)}
                icon={Wallet}
                hint="Net payroll"
                iconClassName="bg-violet-50 text-violet-600"
              />
            ) : (
              <StatCard
                label={`Payroll · ${data.stats.payrollMonthLabel}`}
                value="Available"
                icon={Wallet}
                hint="Your payslips are ready to view"
                iconClassName="bg-violet-50 text-violet-600"
              />
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Employee growth</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">Headcount over the last 12 months</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  {data.growth[0]?.headcount ?? 0} → {data.growth[data.growth.length - 1]?.headcount ?? 0}
                </span>
              </CardHeader>
              <CardContent>
                <div className="h-[248px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.growth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        dy={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        width={44}
                        domain={['dataMin - 6', 'dataMax + 6']}
                      />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="headcount"
                        name="Headcount"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="url(#headcountGradient)"
                        activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department distribution</CardTitle>
                <p className="text-[12px] text-slate-500">Share of total headcount</p>
              </CardHeader>
              <CardContent>
                <div className="relative h-[168px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.departments}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {data.departments.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold tracking-tight text-foreground">{data.stats.totalEmployees}</span>
                    <span className="text-[10.5px] uppercase tracking-wide text-slate-400">Employees</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {data.departments.slice(0, 5).map((entry) => {
                    const share = Math.round((entry.value / data.stats.totalEmployees) * 100)
                    return (
                      <div key={entry.name} className="flex items-center gap-2 text-[11.5px]">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate text-slate-600">{entry.name}</span>
                        <span className="tabular-nums text-slate-400">{entry.value}</span>
                        <span className="w-8 text-right font-medium tabular-nums text-slate-500">{share}%</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Attendance overview</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">Daily status for the last seven working days</p>
                </div>
                <div className="hidden items-center gap-3 text-[10.5px] text-slate-500 sm:flex">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" />Present</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-400" />Leave</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-400" />Absent</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.attendance} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={44} />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="onLeave" name="On leave" stackId="a" fill="#fbbf24" />
                      <Bar dataKey="absent" name="Absent" stackId="a" fill="#f87171" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Payroll summary</CardTitle>
                  <p className="mt-0.5 text-[12px] text-slate-500">{data.currentRun.periodLabel}</p>
                </div>
                <StatusBadge status={data.currentRun.status} />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Net payroll</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {canViewSensitive ? formatCurrency(data.currentRun.netTotal) : 'Restricted'}
                </p>
                <p className="mt-1 text-[11.5px] text-slate-400">
                  {canViewSensitive
                    ? `${data.currentRun.employeeCount} employees in this run`
                    : 'Switch to Payroll Admin to view organisation payroll figures.'}
                </p>

                {canViewSensitive ? (
                  <>
                    <div className="mt-5 space-y-2.5 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Gross earnings</span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {formatCurrency(data.currentRun.grossTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Deductions</span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {formatCurrency(data.currentRun.deductionsTotal)}
                        </span>
                      </div>
                      <Progress
                        value={(data.currentRun.deductionsTotal / data.currentRun.grossTotal) * 100}
                        indicatorClassName="bg-amber-500"
                      />
                      <p className="text-[10.5px] text-slate-400">
                        Deductions represent{' '}
                        {Math.round((data.currentRun.deductionsTotal / data.currentRun.grossTotal) * 100)}% of gross.
                        Values come from the current payroll run.
                      </p>
                    </div>
                  </>
                ) : null}

                <div className="mt-auto pt-5">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/payroll">
                      Open payroll
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent activity</CardTitle>
                {canAccess('audit') ? (
                  <Link to="/audit-logs" className="text-[11.5px] font-medium text-primary hover:underline">
                    Audit logs
                  </Link>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3.5">
                {data.activities.slice(0, 5).map((activity, index) => (
                  <div key={activity.id} className="flex gap-2.5">
                    <span
                      className={cn(
                        'mt-1 size-1.5 shrink-0 rounded-full',
                        index === 0 ? 'bg-primary' : 'bg-slate-300',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] leading-snug text-slate-700">
                        <span className="font-medium text-foreground">{activity.actor}</span> {activity.action.toLowerCase()}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-slate-400">
                        {activity.target} · {formatDateTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Celebrations</CardTitle>
                <PartyPopper className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    <Cake className="size-3" /> Upcoming birthdays
                  </p>
                  <div className="space-y-2.5">
                    {data.birthdays.map((item) => (
                      <div key={`b-${item.employee.id}`} className="flex items-center justify-between gap-2">
                        <AvatarName
                          firstName={item.employee.firstName}
                          lastName={item.employee.lastName}
                          subtitle={formatDate(item.date, 'dd MMM')}
                          size="sm"
                        />
                        <span className="text-[10.5px] text-slate-400">
                          {item.daysAway === 0 ? 'Today' : `${item.daysAway}d`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                    <Gift className="size-3" /> Work anniversaries
                  </p>
                  <div className="space-y-2.5">
                    {data.anniversaries.slice(0, 3).map((item) => (
                      <div key={`a-${item.employee.id}`} className="flex items-center justify-between gap-2">
                        <AvatarName
                          firstName={item.employee.firstName}
                          lastName={item.employee.lastName}
                          subtitle={`${item.years} year${item.years === 1 ? '' : 's'}`}
                          size="sm"
                        />
                        <span className="text-[10.5px] text-slate-400">{formatDate(item.date, 'dd MMM')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Quick actions</CardTitle>
                  <Sparkles className="size-4 text-primary" />
                </CardHeader>
                <CardContent className="grid gap-2">
                  {quickLinks.map((link) => {
                    const Icon = quickActionIcons[link.href as keyof typeof quickActionIcons] ?? CalendarCheck2
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary-50/50 hover:text-primary"
                      >
                        <span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <Icon className="size-3.5" />
                        </span>
                        {link.label}
                        <ArrowRight className="ml-auto size-3.5 text-slate-300" />
                      </Link>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming holidays</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {data.upcomingHolidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 flex-col items-center justify-center rounded-md bg-primary-50 text-primary">
                        <span className="text-[10px] font-semibold uppercase leading-none">
                          {formatDate(holiday.date, 'MMM')}
                        </span>
                        <span className="text-[12px] font-bold leading-tight">{formatDate(holiday.date, 'dd')}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-slate-700">{holiday.name}</p>
                        <p className="text-[10.5px] text-slate-400">{holiday.type} holiday</p>
                      </div>
                      <StatusBadge status={holiday.type} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {roleLabel} scope
            </span>
            <span>Live database metrics · Currency INR · Asia/Kolkata</span>
          </div>
        </>
      )}
    </div>
  )
}
