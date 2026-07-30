'use client'

import React, { useState } from 'react'

interface BusinessVisualProps {
  logoUrl?: string | null
  emoji: string
  name: string
  className?: string
}

export default function BusinessVisual({
  logoUrl,
  emoji,
  name,
  className = '',
}: BusinessVisualProps) {
  const isFeatureEnabled =
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true'
  const [loadError, setLoadError] = useState(false)

  if (isFeatureEnabled && logoUrl && !loadError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setLoadError(true)}
        className={`object-contain max-h-12 w-auto max-w-[120px] rounded-lg ${className}`}
      />
    )
  }

  // Fallback to the emoji
  return <span className={`text-4xl inline-block ${className}`}>{emoji}</span>
}
