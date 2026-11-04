import type { AuthSession } from './api-types'
import { clearSession, getAccessToken, getRefreshToken, writeSession } from './auth-storage'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
export const API_BASE_URL = (configuredBaseUrl ?? 'http://localhost:5095/api').replace(/\/+$/, '')

type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  /** Attach the bearer token and transparently refresh on 401. Defaults to true. */
  auth?: boolean
  signal?: AbortSignal
  headers?: HeadersInit
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors?: Record<string, string[]>
  readonly traceId?: string

  constructor(
    status: number,
    code: string,
    message: string,
    errors?: Record<string, string[]>,
    traceId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
    this.traceId = traceId
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalized}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined) return undefined
  if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
    return body
  }
  headers.set('Content-Type', 'application/json')
  return JSON.stringify(body)
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = 'request_failed'
  let message = response.statusText || `Request failed with status ${response.status}.`
  let errors: Record<string, string[]> | undefined
  let traceId: string | undefined

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as {
        code?: string
        message?: string
        errors?: Record<string, string[]>
        traceId?: string
      }
      if (payload.code) code = payload.code
      if (payload.message) message = payload.message
      errors = payload.errors
      traceId = payload.traceId
    } catch {
      // Non-JSON error bodies keep the status text fallback.
    }
  }

  return new ApiError(response.status, code, message, errors, traceId)
}

let refreshInFlight: Promise<AuthSession> | null = null

async function refreshSession(): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new ApiError(401, 'invalid_refresh_token', 'Your session has expired. Please sign in again.')
      }

      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        throw await toApiError(response)
      }

      const session = (await response.json()) as AuthSession
      writeSession(session)
      return session
    })().finally(() => {
      refreshInFlight = null
    })
  }

  return refreshInFlight
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const { method = 'GET', body, query, auth = true, signal, headers } = options

  const perform = (token: string | null) => {
    const requestHeaders = new Headers(headers)
    requestHeaders.set('Accept', 'application/json')
    requestHeaders.set('ngrok-skip-browser-warning', 'true')
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
    const payload = serializeBody(body, requestHeaders)
    return fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
    })
  }

  let response = await perform(auth ? getAccessToken() : null)

  if (response.status === 401 && auth && getRefreshToken()) {
    try {
      const session = await refreshSession()
      response = await perform(session.accessToken)
    } catch {
      clearSession()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('horizon:session-expired'))
      }
    }
  }

  return response
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return (await response.text()) as T
}

export interface DownloadedFile {
  blob: Blob
  filename: string
}

export async function apiDownload(path: string, fallbackFilename: string): Promise<DownloadedFile> {
  const response = await send(path, { method: 'GET' })
  if (!response.ok) throw await toApiError(response)

  const disposition = response.headers.get('content-disposition') ?? ''
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
  const filename = match ? decodeURIComponent(match[1].replace(/"/g, '').trim()) : fallbackFilename
  return { blob: await response.blob(), filename }
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
