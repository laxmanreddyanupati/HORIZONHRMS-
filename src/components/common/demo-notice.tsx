import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DemoNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[11.5px] leading-relaxed text-sky-800',
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
