import React from 'react'

export interface IntelliStampMarkProps {
  size?: number
  className?: string
  variant?: 'accent' | 'monochrome'
  'aria-label'?: string
}

/**
 * IntelliStamp Vector Mark
 * Exact geometry derived from the approved brand asset:
 * - Loyalty stamp silhouette with bulb handle and base plate
 * - Signature 4-dot punch trail underneath: 3 filled + 1 open (next stamp)
 */
export default function IntelliStampMark({
  size = 28,
  className = '',
  variant = 'accent',
  'aria-label': ariaLabel,
}: IntelliStampMarkProps) {
  const accentColor = variant === 'accent' ? '#F59E0B' : 'currentColor'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : 'presentation'}
    >
      {/* Stamp Handle Bulb and Neck */}
      <path
        d="M14.5 16.5C14.5 14 13 12.5 13 9.5C13 6.73858 15.2386 4.5 18 4.5C20.7614 4.5 23 6.73858 23 9.5C23 12.5 21.5 14 21.5 16.5"
        stroke={accentColor}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Stamp Base Bar */}
      <rect
        x="7"
        y="16.5"
        width="22"
        height="4"
        rx="2"
        stroke={accentColor}
        strokeWidth="2.25"
        strokeLinejoin="round"
      />

      {/* 4 Progress Punch Trail Dots underneath: 3 filled + 1 open */}
      <circle cx="9.25" cy="25.5" r="1.85" fill={accentColor} />
      <circle cx="15.08" cy="25.5" r="1.85" fill={accentColor} />
      <circle cx="20.92" cy="25.5" r="1.85" fill={accentColor} />
      <circle
        cx="26.75"
        cy="25.5"
        r="1.85"
        stroke={accentColor}
        strokeWidth="1.75"
        fill="none"
      />
    </svg>
  )
}
