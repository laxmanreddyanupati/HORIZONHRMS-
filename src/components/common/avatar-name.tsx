import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, initials } from '@/lib/utils'

const palette = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
]

function colorFor(name: string): string {
  const charCode = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return palette[charCode % palette.length]
}

interface AvatarNameProps {
  firstName: string
  lastName: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarName({ firstName, lastName, subtitle, size = 'md', className }: AvatarNameProps) {
  const name = `${firstName} ${lastName}`
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar className={cn(size === 'sm' && 'size-7', size === 'lg' && 'size-12')}>
        <AvatarFallback className={cn(colorFor(name), size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-[11px]')}>
          {initials(firstName, lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className={cn('truncate font-medium text-foreground', size === 'lg' ? 'text-base' : 'text-[13px]')}>{name}</p>
        {subtitle ? <p className="truncate text-[11.5px] text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  )
}
