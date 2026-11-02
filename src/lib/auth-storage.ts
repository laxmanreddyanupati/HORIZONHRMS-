import type { AuthSession, AuthUser } from './api-types'

const STORAGE_KEY = 'horizon-auth-session'

let cached: AuthSession | null | undefined

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AuthSession>
  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 0 &&
    typeof candidate.accessTokenExpiresAt === 'string' &&
    Boolean(candidate.user) &&
    typeof candidate.user?.email === 'string'
  )
}

export function readSession(): AuthSession | null {
  if (cached !== undefined) return cached
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cached = null
      return cached
    }
    const parsed: unknown = JSON.parse(raw)
    cached = isSession(parsed) ? parsed : null
    if (!cached) window.localStorage.removeItem(STORAGE_KEY)
    return cached
  } catch {
    cached = null
    return cached
  }
}

export function writeSession(session: AuthSession): void {
  cached = session
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage can be unavailable (private mode); the in-memory session still works.
  }
}

export function clearSession(): void {
  cached = null
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null
}

export function getRefreshToken(): string | null {
  return readSession()?.refreshToken ?? null
}

export function getCurrentUser(): AuthUser | null {
  return readSession()?.user ?? null
}
