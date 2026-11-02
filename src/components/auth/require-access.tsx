import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRole } from '@/contexts/role-context'
import type { ModuleKey } from '@/lib/constants'
import type { ReactNode } from 'react'

export function AccessRestricted({ moduleKey }: { moduleKey: ModuleKey }) {
  const { roleLabel } = useRole()
  const label = moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-20 text-center shadow-card">
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldAlert className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">This area is not available for your role</h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        Your <span className="font-medium text-slate-700">{roleLabel}</span> role does not have access to{' '}
        {label}. Contact an administrator if you need access.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>
      </div>
      <p className="mt-5 text-[11px] text-slate-400">
        Access is enforced by the HRMS API for every request.
      </p>
    </div>
  )
}

export function RequireAccess({ moduleKey, children }: { moduleKey: ModuleKey; children: ReactNode }) {
  const { canAccess } = useRole()
  if (!canAccess(moduleKey)) return <AccessRestricted moduleKey={moduleKey} />
  return <>{children}</>
}
