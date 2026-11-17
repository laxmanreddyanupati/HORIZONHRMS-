import { apiRequest } from '@/lib/api-client'

export interface Notification {
  id: string
  title: string
  message: string
  module: string
  target?: string | null
  isRead: boolean
  createdAt: string
  readAt?: string | null
}

export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  return apiRequest<Notification[]>('/notifications', { query: { unreadOnly } })
}

export async function fetchUnreadCount(): Promise<number> {
  const result = await apiRequest<{ count: number }>('/notifications/unread-count')
  return result.count
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

export async function markAllNotificationsRead(): Promise<number> {
  const result = await apiRequest<{ marked: number }>('/notifications/read-all', { method: 'POST' })
  return result.marked
}