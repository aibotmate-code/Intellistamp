'use client'

import React, { useState } from 'react'

interface BusinessVisualProps {
  logoUrl?: string | null
  emoji?: string
  name: string
  className?: string
  logoPositionX?: number | null
  logoPositionY?: number | null
  logoScale?: number | null
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
  logoPositionX,
  logoPositionY,
  logoScale,
}: BusinessVisualProps) {
  const isFeatureEnabled =
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED !== 'false'
  const [loadError, setLoadError] = useState(false)

  const posX = typeof logoPositionX === 'number' && !isNaN(logoPositionX) ? logoPositionX : 50
  const posY = typeof logoPositionY === 'number' && !isNaN(logoPositionY) ? logoPositionY : 50
  const scale = typeof logoScale === 'number' && !isNaN(logoScale) && logoScale > 0 ? logoScale : 1

  if (isFeatureEnabled && logoUrl && !loadError) {
    return (
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-900/80 border border-zinc-700/50 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-xs ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          onError={() => setLoadError(true)}
          className="w-full h-full object-cover rounded-full"
          style={{
            objectPosition: `${posX}% ${posY}%`,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: `${posX}% ${posY}%`,
          }}
        />
      </div>
    )
  }

  const initials = getInitials(name)
  if (initials) {
    return (
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center font-bold text-xs sm:text-sm text-zinc-200 tracking-wider select-none shrink-0 overflow-hidden shadow-xs ${className}`}
        aria-label={name}
      >
        {initials}
      </div>
    )
  }

  // Fallback to the emoji in a matching circular container
  return (
    <div
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-xl sm:text-2xl select-none shrink-0 overflow-hidden shadow-xs ${className}`}
    >
      <span className="leading-none">{emoji || '🏷️'}</span>
    </div>
  )
}

