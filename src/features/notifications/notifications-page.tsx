import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '@/services/notification-service'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['notifications'], queryFn: () => fetchNotifications(false) })
  const unread = useQuery({ queryKey: ['notifications-unread'], queryFn: fetchUnreadCount })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      toast.success(count > 0 ? `Marked ${count} as read` : 'No unread notifications')
    },
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="Approvals, reminders and updates for your account."
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck /> Mark all read
          </Button>
        }
      />
      {list.data?.length ? (
        <div className="space-y-3">
          {list.data.map((n: Notification) => (
            <Card key={n.id} className={n.isRead ? 'opacity-70' : ''}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead ? (
                  <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                    Mark read
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      )}
      {unread.data ? <p className="text-xs text-slate-400">Unread: {unread.data}</p> : null}
    </div>
  )
}