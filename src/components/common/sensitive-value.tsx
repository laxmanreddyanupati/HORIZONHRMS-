import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SensitiveValueProps {
  value: string | undefined | null
  visible: boolean
  className?: string
  mono?: boolean
  maskedLabel?: string
}

/**
 * Displays bank and statutory identifiers only when the signed-in role is
 * allowed to see them. The API enforces the same scope.
 */
export function SensitiveValue({
  value,
  visible,
  className,
  mono = true,
  maskedLabel = 'Restricted',
}: SensitiveValueProps) {
  if (!visible) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-slate-400', className)}>
        <Lock className="size-3" />
        {maskedLabel}
      </span>
    )
  }
  return <span className={cn(mono && 'font-mono text-[12px] tabular-nums', className)}>{value || '—'}</span>
}
