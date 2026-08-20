import React from 'react'
import LogoMark from './LogoMark'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showMark?: boolean
  className?: string
  markVariant?: 'accent' | 'monochrome'
}

export default function Logo({
  size = 'md',
  showMark = true,
  className = '',
  markVariant = 'accent',
}: LogoProps) {
  const markSize = size === 'sm' ? 18 : size === 'md' ? 22 : 28
  const textClasses = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {showMark && <LogoMark size={markSize} variant={markVariant} />}
      <span className={`font-semibold tracking-tight ${textClasses}`}>
        <span className="text-zinc-100">Intelli</span>
        <span className="text-amber-500 font-bold">Stamp</span>
      </span>
    </div>
  )
}
