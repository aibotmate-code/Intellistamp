import React from 'react'

interface LogoMarkProps {
  size?: number
  className?: string
  variant?: 'accent' | 'monochrome'
}

/**
 * IntelliStamp Vector Mark
 * Derivation: Loyalty punch stamp silhouette with forward progression notch and signature 3-dot punch trail.
 */
export default function LogoMark({ size = 24, className = '', variant = 'accent' }: LogoMarkProps) {
  const accentColor = variant === 'accent' ? 'var(--is-accent, #F59E0B)' : 'currentColor'
  const baseColor = variant === 'accent' ? '#F4F4F5' : 'currentColor'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Outer rounded punch card shield / stamp contour */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke={accentColor}
        strokeWidth="1.75"
        className="transition-colors"
      />

      {/* Internal progressive upward growth notch */}
      <path
        d="M6.5 15.5L10.5 11.5L13.5 14.5L17.5 8.5"
        stroke={accentColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Signature 3 punch-trail dots representing progressive visits */}
      <circle cx="6.5" cy="15.5" r="1.5" fill={baseColor} />
      <circle cx="10.5" cy="11.5" r="1.5" fill={baseColor} />
      <circle cx="17.5" cy="8.5" r="1.75" fill={accentColor} />
    </svg>
  )
}
