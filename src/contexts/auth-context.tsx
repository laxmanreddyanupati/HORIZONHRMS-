import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from '@/lib/api-client'
import type { AuthSession, AuthUser } from '@/lib/api-types'
import { clearSession, getRefreshToken, readSession, writeSession } from '@/lib/auth-storage'
import { hydrateReferenceData } from '@/lib/reference-data'
import { useQueryClient } from '@tanstack/react-query'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(() => readSession()?.user ?? null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const session = readSession()
      if (!session) {
        if (!cancelled) setIsBootstrapping(false)
        return
      }

      try {
        const current = await apiRequest<AuthUser>('/auth/me')
        if (cancelled) return
        const latest = readSession() ?? session
        writeSession({ ...latest, user: current })
        setUser(current)
        await hydrateReferenceData()
      } catch {
        clearSession()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsBootstrapping(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onExpired = () => {
      clearSession()
      queryClient.clear()
      setUser(null)
    }
    window.addEventListener('horizon:session-expired', onExpired)
    return () => window.removeEventListener('horizon:session-expired', onExpired)
  }, [queryClient])

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    queryClient.clear()
    writeSession(session)
    await hydrateReferenceData(true)
    setUser(session.user)
    return session.user
  }, [queryClient])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await apiRequest<void>('/auth/logout', { method: 'POST', body: { refreshToken } })
      }
    } catch {
      // A revoked or expired refresh token must not prevent local sign-out.
    } finally {
      clearSession()
      queryClient.clear()
      setUser(null)
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      logout,
    }),
    [user, isBootstrapping, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
