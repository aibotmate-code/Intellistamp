import React from 'react'
import IntelliStampMark from './IntelliStampMark'
import IntellicalLabsAttribution from './IntellicalLabsAttribution'

export interface IntelliStampLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showMark?: boolean
  className?: string
  markVariant?: 'accent' | 'monochrome'
  withAttribution?: boolean
  layout?: 'horizontal' | 'vertical'
}

export default function IntelliStampLogo({
  size = 'md',
  showMark = true,
  className = '',
  markVariant = 'accent',
  withAttribution = false,
  layout = 'horizontal',
}: IntelliStampLogoProps) {
  const markSize = size === 'sm' ? 22 : size === 'md' ? 28 : size === 'lg' ? 36 : 48
  const textClasses =
    size === 'sm'
      ? 'text-sm font-semibold'
      : size === 'md'
      ? 'text-base font-semibold tracking-tight'
      : size === 'lg'
      ? 'text-xl font-semibold tracking-tight'
      : 'text-2xl font-bold tracking-tight'

  if (layout === 'vertical') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        {showMark && <IntelliStampMark size={markSize} variant={markVariant} />}
        <div className={`mt-2 ${textClasses} flex items-center`}>
          <span className="text-zinc-100">Intelli</span>
          <span className="text-amber-500">Stamp</span>
        </div>
        {withAttribution && (
          <div className="mt-1">
            <IntellicalLabsAttribution size="xs" asLink={false} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {showMark && <IntelliStampMark size={markSize} variant={markVariant} />}
      <div className="flex flex-col justify-center">
        <div className={`${textClasses} flex items-center leading-none`}>
          <span className="text-zinc-100">Intelli</span>
          <span className="text-amber-500">Stamp</span>
        </div>
        {withAttribution && (
          <div className="mt-1">
            <IntellicalLabsAttribution size="xs" asLink={false} />
          </div>
        )}
      </div>
    </div>
  )
}
