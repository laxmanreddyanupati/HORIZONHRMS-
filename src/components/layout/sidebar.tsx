import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, LifeBuoy } from 'lucide-react'
import { NAV_SECTIONS, type NavItem } from '@/lib/constants'
import { useRole } from '@/contexts/role-context'
import { leaveRequests } from '@/data/leaves'
import { jobOpenings } from '@/data/recruitment'
import { expenseClaims } from '@/data/expenses'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobile?: boolean
  onNavigate?: () => void
}

function NavRow({
  item,
  collapsed,
  badgeCounts,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  badgeCounts: Record<string, number>
  onNavigate?: () => void
}) {
  const badge = item.badge ? (badgeCounts[item.badge] ?? 0) : 0
  const link = (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9.5 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-primary text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-white',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <item.icon className="size-4.5 shrink-0" strokeWidth={1.9} />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {badge > 0 ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                item.href === '/leave' || item.href === '/expenses' || item.href === '/recruitment'
                  ? 'bg-white/15 text-white'
                  : 'bg-white/10 text-sidebar-foreground',
              )}
            >
              {badge}
            </span>
          ) : null}
        </>
      ) : (
        <span className="sr-only">{item.label}</span>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { canAccess, roleLabel } = useRole()

  // Recomputed on every render so the badges follow the hydrated API records
  // instead of the static mock fixture counts captured at module load.
  const badgeCounts: Record<string, number> = {
    'pending-leaves': leaveRequests.filter((request) => request.status === 'Pending').length,
    'open-roles': jobOpenings.filter((job) => job.status === 'Open').length,
    'pending-expenses': expenseClaims.filter((claim) => claim.status === 'Pending').length,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => canAccess(item.module))
          if (items.length === 0) return null
          return (
            <div key={section.label} className="mb-5 last:mb-0">
              {collapsed ? (
                <div className="mx-2 mb-2 h-px bg-white/8" />
              ) : (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted/80">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    badgeCounts={badgeCounts}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className={cn('border-t border-white/8 p-3', collapsed && 'px-2')}>
        {!collapsed ? (
          <div className="rounded-lg bg-white/[0.04] p-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-sky-400/15 text-sky-300">
                <LifeBuoy className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-white">Horizon HRMS</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-sidebar-muted">
                  Signed in as <span className="text-sidebar-foreground">{roleLabel}</span>.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggleCollapse, mobile = false, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground',
        mobile ? 'w-full' : 'fixed inset-y-0 left-0 z-40 hidden border-r border-white/5 transition-[width] duration-200 lg:flex',
        !mobile && (collapsed ? 'w-[76px]' : 'w-[264px]'),
      )}
    >
      <div className={cn('flex h-15 shrink-0 items-center border-b border-white/6 px-4', collapsed ? 'justify-center px-2' : 'justify-between')}>
        <div className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')}>
          <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-[15px] font-bold tracking-tight text-white">H</span>
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold uppercase tracking-[0.16em] text-white">Horizon</p>
              <p className="text-[9.5px] font-medium uppercase tracking-[0.22em] text-sidebar-muted">HRMS</p>
            </div>
          ) : null}
        </div>
        {!mobile && !collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1 text-sidebar-muted transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="size-4" />
          </button>
        ) : null}
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      {!mobile ? (
        <div className={cn('border-t border-white/6 p-2.5', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex size-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-white/8 hover:text-white"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-sidebar-muted transition-colors hover:bg-white/6 hover:text-white"
            >
              <ChevronsLeft className="size-3.5" />
              Collapse sidebar
            </button>
          )}
        </div>
      ) : null}
    </aside>
  )
}
