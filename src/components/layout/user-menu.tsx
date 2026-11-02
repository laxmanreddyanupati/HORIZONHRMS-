import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, KeyRound, Loader2, LogOut, Settings, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { useRole } from '@/contexts/role-context'
import { initials } from '@/lib/utils'

export function UserMenu() {
  const { persona, roleLabel, canAccess } = useRole()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const nameParts = persona.name.split(' ')

  const signOut = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Open user menu"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary-100 text-[11px] font-semibold text-primary-700">
              {initials(nameParts[0], nameParts[1] ?? '')}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left lg:block">
            <p className="max-w-32 truncate text-[12px] font-medium leading-tight text-foreground">{persona.name}</p>
            <p className="max-w-32 truncate text-[10px] leading-tight text-slate-400">{roleLabel}</p>
          </div>
          <ChevronDown className="hidden size-3 text-slate-400 lg:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2.5 pb-2">
          <p className="text-[13px] font-medium text-foreground">{persona.name}</p>
          <p className="truncate text-[11px] text-slate-400">{persona.email}</p>
          <p className="mt-1 inline-flex items-center gap-1 rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
            {roleLabel}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <UserRound />
          My profile
        </DropdownMenuItem>
        {canAccess('settings') ? (
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings />
            Workspace settings
          </DropdownMenuItem>
        ) : null}
        {canAccess('audit') ? (
          <DropdownMenuItem onClick={() => navigate('/audit-logs')}>
            <KeyRound />
            Audit logs
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()} disabled={signingOut}>
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
