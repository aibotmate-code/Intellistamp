import { cn } from '@/lib/utils'
import { type TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-zinc-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 shadow-xs',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500/80 focus-visible:border-red-500 focus-visible:ring-red-500/40',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400 font-normal">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-zinc-500">{helperText}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export default Textarea
export { Textarea }
