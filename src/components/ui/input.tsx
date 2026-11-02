import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9.5 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70',
        'file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary',
        className,
      )}
      {...props}
    />
  )
}
