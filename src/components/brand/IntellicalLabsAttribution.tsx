import React from 'react'

export interface IntellicalLabsAttributionProps {
  className?: string
  asLink?: boolean
  size?: 'xs' | 'sm' | 'md'
}

/**
 * IntellicalLabsAttribution
 * Standardized parent-brand attribution component.
 * Exact rule: "by Intellical Labs" (with Intellical in soft white and Labs in warm amber)
 */
export default function IntellicalLabsAttribution({
  className = '',
  asLink = true,
  size = 'xs',
}: IntellicalLabsAttributionProps) {
  const sizeClasses =
    size === 'xs'
      ? 'text-[11px]'
      : size === 'sm'
      ? 'text-xs'
      : 'text-sm'

  const content = (
    <span className={`inline-flex items-center gap-1 font-normal select-none ${sizeClasses} ${className}`}>
      <span className="text-zinc-500">by</span>
      <span className="text-zinc-300 font-medium tracking-tight">Intellical</span>
      <span className="text-amber-500 font-semibold tracking-tight">Labs</span>
    </span>
  )

  if (asLink) {
    return (
      <a
        href="https://intellicallabs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center hover:opacity-85 transition-opacity"
        aria-label="Intellical Labs website"
      >
        {content}
      </a>
    )
  }

  return content
}
