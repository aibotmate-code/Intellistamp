'use client'

import React from 'react'
import type { BusinessBranding } from '@/types'

interface BrandingWrapperProps {
  branding?: BusinessBranding | null
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function BrandingWrapper({
  branding,
  children,
  className,
  style,
}: BrandingWrapperProps) {
  const isFeatureEnabled =
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true'

  if (!isFeatureEnabled || !branding || !branding.is_enabled) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  // Map the branding colors to scoped CSS variables
  const brandStyles: React.CSSProperties = {
    ...style,
    '--brand-primary': branding.primary_color,
    '--brand-primary-dark': branding.primary_dark_color,
    '--brand-primary-light': branding.primary_light_color,
    '--brand-secondary': branding.secondary_color || branding.primary_color,
    '--brand-accent': branding.accent_color || branding.primary_color,
    '--brand-surface': branding.surface_color || 'var(--color-surface)',
    '--brand-bg': branding.background_color || 'var(--color-bg)',
    '--brand-on-primary': branding.text_on_primary,
  } as React.CSSProperties

  return (
    <div className={className} style={brandStyles}>
      {children}
    </div>
  )
}
