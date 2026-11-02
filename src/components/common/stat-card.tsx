import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  trend?: {
    value: string
    direction: 'up' | 'down'
    positive?: boolean
  }
  iconClassName?: string
}

export function StatCard({ label, value, hint, icon: Icon, trend, iconClassName }: StatCardProps) {
  const trendPositive = trend?.positive ?? trend?.direction === 'up'
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-slate-500">{label}</p>
        {Icon ? (
          <span className={cn('flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary', iconClassName)}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trendPositive ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-slate-400">{hint}</span> : null}
      </div>
    </div>
  )
}
