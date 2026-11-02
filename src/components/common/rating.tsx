import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingProps {
  value: number
  max?: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md'
  className?: string
}

export function Rating({ value, max = 5, onChange, size = 'sm', className }: RatingProps) {
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={onChange ? 'radiogroup' : undefined}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= value
        if (onChange) {
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue)}
              className="rounded p-0.5 transition-transform hover:scale-110"
              aria-label={`Rating ${starValue} of ${max}`}
            >
              <Star
                className={cn(
                  size === 'md' ? 'size-5' : 'size-3.5',
                  filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300',
                )}
              />
            </button>
          )
        }
        return (
          <Star
            key={starValue}
            className={cn(
              size === 'md' ? 'size-5' : 'size-3.5',
              filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300',
            )}
          />
        )
      })}
    </div>
  )
}
