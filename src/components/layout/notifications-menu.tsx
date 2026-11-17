import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  Megaphone,
  ReceiptText,
  UserRound,
  Wallet,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from '@/services/notification-service'
import { cn } from '@/lib/utils'

const typeStyles: Record<string, { icon: typeof Bell; className: string }> = {
  leave: { icon: CalendarCheck2, className: 'bg-violet-50 text-violet-600' },
  payroll: { icon: Wallet, className: 'bg-emerald-50 text-emerald-600' },
  attendance: { icon: CalendarCheck2, className: 'bg-amber-50 text-amber-600' },
  recruitment: { icon: UserRound, className: 'bg-sky-50 text-sky-600' },
  system: { icon: Megaphone, className: 'bg-slate-100 text-slate-500' },
}

export function NotificationsMenu() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['notifications'], queryFn: () => fetchNotifications(false), refetchInterval: 30_000 })
  const count = useQuery({ queryKey: ['notifications-unread'], queryFn: fetchUnreadCount, refetchInterval: 30_000 })
  const items = list.data ?? []
  const navigate = useNavigate()
  const unread = count.data ?? items.filter((item) => !item.isRead).length

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
  }
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate,
    onError: () => toast.error('Notifications could not be marked as read.') })
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate,
    onError: () => toast.error('Notification could not be marked as read.') })

  const openNotification = async (id: string, href?: string | null) => {
    try {
      await markRead.mutateAsync(id)
      if (href?.startsWith('/') && !href.startsWith('//')) navigate(href)
    } catch { /* The mutation displays the error. */ }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-secondary hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="size-4.5" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-white ring-2 ring-white">
              {unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-[11px] text-slate-400">{unread} unread</p>
          </div>
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:text-slate-300 disabled:no-underline"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </button>
        </div>
        <div className="scrollbar-thin max-h-[380px] overflow-y-auto">
          {list.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p> : list.isError ? (
            <button type="button" className="p-4 text-sm text-primary" onClick={() => void list.refetch()}>Could not load notifications. Retry</button>
          ) : items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No notifications. You're all caught up.</p> : null}
          {items.map((item) => {
            const style = typeStyles[item.module.toLowerCase()] ?? typeStyles.system
            const Icon = style.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => void openNotification(item.id, item.target)}
                className={cn(
                  'flex w-full gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50',
                  !item.isRead && 'bg-primary-50/30',
                )}
              >
                <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md', style.className)}>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn('text-[12.5px] leading-tight text-foreground', !item.isRead ? 'font-semibold' : 'font-medium')}>
                      {item.title}
                    </span>
                    {!item.isRead ? <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-snug text-slate-500">{item.message}</span>
                  <span className="mt-1 block text-[10.5px] text-slate-400">
                    {format(parseISO(item.createdAt), 'dd MMM, h:mm a')}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="border-t border-border px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
            <ReceiptText className="size-3" />
            Notifications are shown in-app only; no email or SMS is sent.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
