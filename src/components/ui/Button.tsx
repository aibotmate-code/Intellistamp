import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-150 select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          {
            'bg-zinc-100 text-zinc-950 hover:bg-zinc-200 active:bg-zinc-300 border border-transparent shadow-xs':
              variant === 'primary',
            'bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white active:bg-zinc-850 border border-zinc-800':
              variant === 'secondary',
            'bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white border border-zinc-800':
              variant === 'outline',
            'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 bg-transparent':
              variant === 'ghost',
            'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20':
              variant === 'danger',
          },
          {
            'h-8 px-3 text-xs gap-1.5 rounded-md': size === 'sm',
            'h-9 px-4 text-sm gap-2 rounded-md': size === 'md',
            'h-11 px-5 text-sm gap-2.5 rounded-md': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export default Button
export { Button }
