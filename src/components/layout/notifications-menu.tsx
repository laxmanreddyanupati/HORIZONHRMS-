import { useState } from 'react'
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
import { notifications as seedNotifications } from '@/data/notifications'
import { cn } from '@/lib/utils'

const typeStyles: Record<string, { icon: typeof Bell; className: string }> = {
  leave: { icon: CalendarCheck2, className: 'bg-violet-50 text-violet-600' },
  payroll: { icon: Wallet, className: 'bg-emerald-50 text-emerald-600' },
  attendance: { icon: CalendarCheck2, className: 'bg-amber-50 text-amber-600' },
  recruitment: { icon: UserRound, className: 'bg-sky-50 text-sky-600' },
  system: { icon: Megaphone, className: 'bg-slate-100 text-slate-500' },
}

export function NotificationsMenu() {
  const [items, setItems] = useState(seedNotifications)
  const navigate = useNavigate()
  const unread = items.filter((item) => !item.read).length

  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, read: true })))

  const openNotification = (id: string, href?: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
    if (href) navigate(href)
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
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-[11px] text-slate-400">{unread} unread</p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:text-slate-300 disabled:no-underline"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </button>
        </div>
        <div className="scrollbar-thin max-h-[380px] overflow-y-auto">
          {items.map((item) => {
            const style = typeStyles[item.type] ?? typeStyles.system
            const Icon = style.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openNotification(item.id, item.href)}
                className={cn(
                  'flex w-full gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50',
                  !item.read && 'bg-primary-50/30',
                )}
              >
                <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md', style.className)}>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn('text-[12.5px] leading-tight text-foreground', !item.read ? 'font-semibold' : 'font-medium')}>
                      {item.title}
                    </span>
                    {!item.read ? <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-snug text-slate-500">{item.message}</span>
                  <span className="mt-1 block text-[10.5px] text-slate-400">
                    {format(parseISO(item.time), 'dd MMM, h:mm a')}
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
