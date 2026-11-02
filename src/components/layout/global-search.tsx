import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Building2,
  LayoutDashboard,
  Search,
  Users,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRole } from '@/contexts/role-context'
import { NAV_SECTIONS } from '@/lib/constants'
import { employees } from '@/data/employees'
import { departments, getDepartmentName } from '@/data/organization'
import { jobOpenings } from '@/data/recruitment'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  href: string
  group: 'Pages' | 'Employees' | 'Departments' | 'Job Openings'
  icon: typeof Users
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { canAccess } = useRole()

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    const search = query.trim().toLowerCase()
    if (!search) return []

    const pages: SearchResult[] = NAV_SECTIONS.flatMap((section) => section.items)
      .filter((item) => canAccess(item.module))
      .filter((item) => item.label.toLowerCase().includes(search))
      .map((item) => ({
        id: `page-${item.href}`,
        title: item.label,
        subtitle: 'Go to page',
        href: item.href,
        group: 'Pages',
        icon: item.icon,
      }))

    const people: SearchResult[] = canAccess('employees')
      ? employees
          .filter(
            (employee) =>
              `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(search) ||
              employee.id.toLowerCase().includes(search) ||
              employee.email.toLowerCase().includes(search),
          )
          .slice(0, 5)
          .map((employee) => ({
            id: employee.id,
            title: `${employee.firstName} ${employee.lastName}`,
            subtitle: `${employee.id} · ${getDepartmentName(employee.departmentId)}`,
            href: `/employees/${employee.id}`,
            group: 'Employees',
            icon: Users,
          }))
      : []

    const deptResults: SearchResult[] = canAccess('organization')
      ? departments
          .filter(
            (department) =>
              department.name.toLowerCase().includes(search) || department.code.toLowerCase().includes(search),
          )
          .slice(0, 4)
          .map((department) => ({
            id: department.id,
            title: department.name,
            subtitle: `${department.code} · ${department.location}`,
            href: '/organization',
            group: 'Departments',
            icon: Building2,
          }))
      : []

    const jobs: SearchResult[] = canAccess('recruitment')
      ? jobOpenings
          .filter(
            (job) =>
              job.title.toLowerCase().includes(search) ||
              job.location.toLowerCase().includes(search) ||
              job.skills.some((skill) => skill.toLowerCase().includes(search)),
          )
          .slice(0, 4)
          .map((job) => ({
            id: job.id,
            title: job.title,
            subtitle: `${job.location} · ${job.openings} opening${job.openings === 1 ? '' : 's'}`,
            href: '/recruitment',
            group: 'Job Openings',
            icon: Briefcase,
          }))
      : []

    return [...pages, ...people, ...deptResults, ...jobs]
  }, [query, canAccess])

  const grouped = results.reduce<Record<string, SearchResult[]>>((accumulator, result) => {
    accumulator[result.group] = [...(accumulator[result.group] ?? []), result]
    return accumulator
  }, {})

  const goTo = (href: string) => {
    onOpenChange(false)
    navigate(href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 p-0" showClose={false}>
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-slate-400" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employees, departments, jobs or pages…"
            className="h-13 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden rounded border border-border bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
            ESC
          </kbd>
        </div>

        <div className="scrollbar-thin max-h-[420px] overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="px-3 py-8">
              <p className="text-center text-[12px] text-slate-400">Start typing to search across the workspace.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Employees', icon: Users, href: '/employees' },
                  { label: 'Attendance', icon: LayoutDashboard, href: '/attendance' },
                  { label: 'Payroll', icon: Briefcase, href: '/payroll' },
                  { label: 'Reports', icon: Building2, href: '/reports' },
                ].map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() => goTo(shortcut.href)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-[12px] font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary-50/50 hover:text-primary"
                  >
                    <shortcut.icon className="size-4 text-slate-400" />
                    {shortcut.label}
                    <ArrowRight className="ml-auto size-3.5 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No results for “{query}”</p>
              <p className="mt-1 text-[12px] text-slate-400">Try an employee name, employee ID, department or job title.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group}</p>
                {items.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => goTo(result.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-primary-50',
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <result.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">{result.title}</span>
                      <span className="block truncate text-[11px] text-slate-400">{result.subtitle}</span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10.5px] text-slate-400">
          <span>{results.length > 0 ? `${results.length} results` : 'Global search'}</span>
          <span>Search is limited to your role scope</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
