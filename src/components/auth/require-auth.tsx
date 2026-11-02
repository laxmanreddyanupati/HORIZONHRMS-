import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
          <ShieldCheck className="size-6" />
        </span>
        <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Restoring your session…
        </div>
      </div>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) return <SessionLoading />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />
  }
  return <>{children}</>
}
