'use client'

import React, { useState } from 'react'

interface BusinessVisualProps {
  logoUrl?: string | null
  emoji?: string
  name: string
  className?: string
}

function getInitials(name: string): string {
  if (!name) return ''
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function BusinessVisual({
  logoUrl,
  emoji,
  name,
  className = '',
}: BusinessVisualProps) {
  const isFeatureEnabled =
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED !== 'false'
  const [loadError, setLoadError] = useState(false)

  if (isFeatureEnabled && logoUrl && !loadError) {
    return (
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-900/80 border border-zinc-700/50 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          onError={() => setLoadError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  const initials = getInitials(name)
  if (initials) {
    return (
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center font-bold text-xs sm:text-sm text-zinc-200 tracking-wider select-none shrink-0 shadow-xs ${className}`}
        aria-label={name}
      >
        {initials}
      </div>
    )
  }

  // Fallback to the emoji
  return <span className={`text-3xl inline-block ${className}`}>{emoji || '🏷️'}</span>
}

