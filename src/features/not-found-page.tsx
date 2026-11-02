import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-20 text-center shadow-card">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary">
        <Compass className="size-6" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">404</p>
      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">This page could not be found</h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        There is no screen at this address. Use the navigation or return to the dashboard to continue.
      </p>
      <Button asChild className="mt-5">
        <Link to="/">
          <ArrowLeft />
          Back to dashboard
        </Link>
      </Button>
    </div>
  )
}
