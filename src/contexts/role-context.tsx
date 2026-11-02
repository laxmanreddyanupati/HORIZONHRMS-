import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Role } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import {
  canAccess as checkAccess,
  canApprove as checkApprove,
  canManagePayroll as checkManagePayroll,
  canViewSensitive as checkSensitive,
  ROLES,
  type ModuleKey,
} from '@/lib/constants'

interface Persona {
  name: string
  email: string
  employeeId: string | null
  title: string
}

interface RoleContextValue {
  role: Role
  persona: Persona
  roleLabel: string
  canAccess: (moduleKey: ModuleKey) => boolean
  canViewSensitive: boolean
  canApprove: boolean
  canManagePayroll: boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const value = useMemo<RoleContextValue>(() => {
    const role: Role = user?.role ?? 'employee'
    const roleLabel = ROLES.find((item) => item.value === role)?.label ?? 'Employee'
    return {
      role,
      persona: {
        name: user?.name ?? 'Signed-out user',
        email: user?.email ?? '',
        employeeId: user?.employeeId ?? null,
        title: roleLabel,
      },
      roleLabel,
      canAccess: (moduleKey: ModuleKey) => checkAccess(role, moduleKey),
      canViewSensitive: checkSensitive(role),
      canApprove: checkApprove(role),
      canManagePayroll: checkManagePayroll(role),
    }
  }, [user])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext)
  if (!context) throw new Error('useRole must be used within a RoleProvider')
  return context
}
