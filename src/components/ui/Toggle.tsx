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
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
          checked ? 'bg-yellow-400' : 'bg-zinc-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
      {(label || description || badge) && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {label && <span className="text-sm font-medium text-white">{label}</span>}
            {badge && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded font-medium',
                {
                  'bg-yellow-400/20 text-yellow-400': badgeColor === 'yellow',
                  'bg-purple-500/20 text-purple-400': badgeColor === 'purple',
                  'bg-green-500/20 text-green-400': badgeColor === 'green',
                  'bg-blue-500/20 text-blue-400': badgeColor === 'blue',
                }
              )}>
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
        </div>
      )}
    </div>
  )
}
