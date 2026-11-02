import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { getDepartmentName } from '@/data/organization'
import { getDesignationTitle } from '@/data/designations'
import { cn, initials } from '@/lib/utils'
import type { OrgNode } from '@/types'

function OrgChartCard({ node }: { node: OrgNode }) {
  const { employee } = node
  const directReports = node.children.length
  return (
    <Link
      to={`/employees/${employee.id}`}
      className="group block w-full max-w-64 rounded-xl border border-border bg-white p-3.5 text-left shadow-card transition-colors hover:border-primary/40 hover:bg-primary-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={`View ${employee.firstName} ${employee.lastName}'s employee profile`}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-semibold text-primary-700">
          {initials(employee.firstName, employee.lastName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="truncate text-[11px] text-slate-500">{employee.id}</p>
        </div>
      </div>
      <p className="mt-2.5 truncate text-[12px] font-medium text-slate-700" title={getDesignationTitle(employee.designationId)}>
        {getDesignationTitle(employee.designationId)}
      </p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500" title={getDepartmentName(employee.departmentId)}>
        <Building2 className="size-3 shrink-0" />
        {getDepartmentName(employee.departmentId)}
      </p>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
        <Users className="size-3" />
        {directReports === 0
          ? 'Individual contributor'
          : `${directReports} direct ${directReports === 1 ? 'report' : 'reports'}`}
      </p>
    </Link>
  )
}

function OrgChartNode({ node, isRoot = false }: { node: OrgNode; isRoot?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <li className={cn('relative flex flex-col items-center', !isRoot && 'pt-5')}>
      {!isRoot ? <span aria-hidden="true" className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-slate-200" /> : null}
      <OrgChartCard node={node} />

      {hasChildren ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-[10.5px] font-medium text-slate-500 shadow-xs transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? 'Hide reports' : `Show ${node.children.length} ${node.children.length === 1 ? 'report' : 'reports'}`}
        </button>
      ) : null}

      {hasChildren && expanded ? (
        <div className="flex flex-col items-center">
          <span aria-hidden="true" className="h-4 w-px bg-slate-200" />
          <ul className="flex items-start gap-5 border-t border-slate-200 pt-0">
            {node.children.map((child) => (
              <OrgChartNode key={child.employee.id} node={child} />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

export function OrgChart({ root }: { root: OrgNode }) {
  return (
    <div className="scrollbar-thin overflow-x-auto pb-3">
      <div className="mx-auto inline-flex min-w-full justify-center px-1 py-1">
        <ul className="flex justify-center">
          <OrgChartNode node={root} isRoot />
        </ul>
      </div>
    </div>
  )
}
