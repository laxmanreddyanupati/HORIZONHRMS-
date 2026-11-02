import { Badge, type BadgeProps } from '@/components/ui/badge'

const variants: Record<string, BadgeProps['variant']> = {
  active: 'success',
  present: 'success',
  approved: 'success',
  paid: 'success',
  completed: 'success',
  verified: 'success',
  hired: 'success',
  reimbursed: 'success',
  open: 'success',
  'on track': 'success',

  probation: 'info',
  'half day': 'info',
  processed: 'info',
  offer: 'info',
  interview: 'info',
  'in progress': 'info',
  scheduled: 'info',
  invited: 'info',
  optional: 'info',
  'on leave': 'purple',

  pending: 'warning',
  late: 'warning',
  'on hold': 'warning',
  draft: 'warning',
  screening: 'warning',
  'at risk': 'warning',
  processing: 'warning',
  public: 'default',

  inactive: 'secondary',
  absent: 'danger',
  rejected: 'danger',
  cancelled: 'danger',
  suspended: 'danger',
  closed: 'danger',
  'not started': 'secondary',

  'full-time': 'outline',
  contract: 'outline',
  internship: 'outline',
  holiday: 'purple',
  weekend: 'secondary',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = variants[status.toLowerCase()] ?? 'secondary'
  return (
    <Badge variant={variant} className={className}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  )
}
