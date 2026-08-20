'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  badge?: string
  badgeColor?: 'yellow' | 'purple' | 'green' | 'blue'
}

export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  badge,
  badgeColor = 'yellow',
}: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description || badge) && (
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            {label && <span className="text-sm font-medium text-zinc-200">{label}</span>}
            {badge && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider',
                  {
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20': badgeColor === 'yellow',
                    'bg-purple-500/10 text-purple-400 border border-purple-500/20': badgeColor === 'purple',
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': badgeColor === 'green',
                    'bg-sky-500/10 text-sky-400 border border-sky-500/20': badgeColor === 'blue',
                  }
                )}
              >
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950',
          checked ? 'bg-zinc-100' : 'bg-zinc-800 border border-zinc-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-150',
            checked ? 'translate-x-4 bg-zinc-950' : 'translate-x-0.5 bg-zinc-400'
          )}
        />
      </button>
    </div>
  )
}
