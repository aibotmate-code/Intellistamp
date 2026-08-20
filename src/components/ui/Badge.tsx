import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors border',
        {
          'bg-zinc-800 text-zinc-200 border-zinc-700': variant === 'default',
          'bg-zinc-900 text-zinc-400 border-zinc-800': variant === 'secondary',
          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': variant === 'success',
          'bg-amber-500/10 text-amber-400 border-amber-500/20': variant === 'warning',
          'bg-rose-500/10 text-rose-400 border-rose-500/20': variant === 'destructive',
          'border-zinc-800 bg-transparent text-zinc-400': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
export default Badge
