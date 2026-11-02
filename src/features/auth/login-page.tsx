import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { ApiError } from '@/lib/api-client'
import { COMPANY } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { login, isAuthenticated, isBootstrapping } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const destination = (location.state as LocationState | null)?.from?.pathname ?? '/'

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : 'Unable to sign in. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-sidebar px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 size-[360px] rounded-full bg-teal-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">Horizon HRMS</p>
              <p className="text-[11px] text-sidebar-foreground/70">{COMPANY.tagline}</p>
            </div>
          </div>
          <h1 className="mt-16 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            People operations, payroll and performance in one workspace.
          </h1>
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-sidebar-foreground/70">
            Sign in with the account provisioned by your administrator. Access to modules is enforced by
            the HRMS API according to your role.
          </p>
          <div className="mt-10 grid max-w-md gap-3 text-[12px] text-sidebar-foreground/70">
            {[
              'Role-based access for HR, managers, payroll and employees',
              'Live employee, leave, attendance and payroll records',
              'Every request authenticated with a bearer token',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[11px] text-sidebar-foreground/50">
          {COMPANY.name} · {COMPANY.location}
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-foreground">Horizon HRMS</p>
              <p className="text-[11px] text-muted-foreground">{COMPANY.tagline}</p>
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Welcome back</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Sign in to your account</h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Use your organisational email address and password.
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@horizontech.example"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-secondary hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] leading-relaxed text-rose-700"
              >
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-10 w-full" disabled={submitting || isBootstrapping}>
              {submitting ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
            Accounts are created by an HR administrator. If you cannot sign in, contact your HR administrator
            or IT support.
          </p>

          {import.meta.env.DEV ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
              Local development: seeded account passwords are written to{' '}
              <code className="rounded bg-white px-1 py-0.5">backend/HorizonHRMS.Api/.seed-credentials.dev.txt</code>.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
