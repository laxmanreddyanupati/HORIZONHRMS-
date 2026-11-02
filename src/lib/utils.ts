import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DEMO_SNAPSHOT_DATE = new Date(2026, 9, 30) // 30 Oct 2026

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`
    return `₹${amount.toLocaleString('en-IN')}`
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatDate(value: string | Date, pattern = 'dd MMM yyyy'): string {
  const date = typeof value === 'string' ? parseISO(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, pattern)
}

export function formatDateTime(value: string): string {
  const date = parseISO(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'dd MMM yyyy, h:mm a')
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function getFullName(first: string, last: string): string {
  return `${first} ${last}`
}

export function maskValue(value: string | undefined, visible: boolean, keep = 4): string {
  if (!value) return '—'
  if (visible) return value
  return `${'•'.repeat(Math.max(0, value.length - keep))}${value.slice(-keep)}`
}

export function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')
}

export function randomDelay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Deterministic pseudo-random generator so demo data stays stable between reloads. */
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getMonthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function calculateTenure(dateOfJoining: string): string {
  const start = parseISO(dateOfJoining)
  const end = DEMO_SNAPSHOT_DATE
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years <= 0) return `${Math.max(rem, 1)} mo`
  return `${years}y ${rem}m`
}
