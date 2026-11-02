import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SEGMENT_LABELS } from '@/lib/constants'
import { getEmployeeById } from '@/data/employees'
import { Fragment } from 'react'

function labelForSegment(segment: string, previous?: string): string {
  const decoded = decodeURIComponent(segment)
  if (decoded.startsWith('HZT-')) {
    const employee = getEmployeeById(decoded)
    return employee ? `${employee.firstName} ${employee.lastName}` : decoded
  }
  if (decoded.startsWith('PR-')) return 'Payroll Summary'
  if (previous === 'payslip') return decoded
  return SEGMENT_LABELS[decoded] ?? decoded.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs: Array<{ label: string; href: string }> = []
  let accumulated = ''
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`
    crumbs.push({ label: labelForSegment(segment, segments[index - 1]), href: accumulated })
  })

  if (crumbs.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home className="size-3.5" />
        <span>Dashboard</span>
      </div>
    )
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12px]">
      <Link to="/" className="flex items-center gap-1 text-slate-500 transition-colors hover:text-primary">
        <Home className="size-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        return (
          <Fragment key={crumb.href}>
            <ChevronRight className="size-3 shrink-0 text-slate-300" />
            {isLast ? (
              <span className="truncate font-medium text-slate-700">{crumb.label}</span>
            ) : (
              <Link to={crumb.href} className="truncate text-slate-500 transition-colors hover:text-primary">
                {crumb.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
