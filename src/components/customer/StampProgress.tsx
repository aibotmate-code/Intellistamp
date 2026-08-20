'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check } from '@phosphor-icons/react'

export interface StampProgressProps {
  stampsRequired: number
  cardStamps: number
  newStampIndex?: number
  rippleIndex?: number | null
  isPulsing?: boolean
  primaryColor?: string
  textOnPrimaryColor?: string
  emptyStampColor?: string
  emptyStampBorderColor?: string
  cardMutedTextColor?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * StampProgress
 * Reusable, tactile punch-card progress component supporting custom merchant palettes,
 * responsive grid layouts, dynamic thresholds, and subtle stamp-fill animations.
 */
export default function StampProgress({
  stampsRequired,
  cardStamps,
  newStampIndex,
  rippleIndex,
  isPulsing,
  primaryColor = '#F59E0B',
  textOnPrimaryColor = '#09090B',
  emptyStampColor = 'rgba(24, 24, 27, 0.6)',
  emptyStampBorderColor = 'rgba(255, 255, 255, 0.12)',
  cardMutedTextColor = '#A1A1AA',
  className = '',
  size = 'md',
}: StampProgressProps) {
  // Determine optimal column layout based on stamp count
  const cols =
    stampsRequired <= 4
      ? stampsRequired
      : stampsRequired <= 6
      ? 3
      : stampsRequired <= 8
      ? 4
      : stampsRequired <= 10
      ? 5
      : 6

  const sizeClasses =
    size === 'sm'
      ? 'min-w-[36px] min-h-[36px] text-xs'
      : size === 'lg'
      ? 'min-w-[52px] min-h-[52px] text-sm'
      : 'min-w-[44px] min-h-[44px] text-xs'

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16

  return (
    <div
      className={cn('grid gap-2.5 my-4 select-none', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-label={`${cardStamps} of ${stampsRequired} stamps collected`}
      role="img"
    >
      {Array.from({ length: stampsRequired }).map((_, i) => {
        const filled = i < cardStamps
        const isNew = i === newStampIndex
        const isRippling = i === rippleIndex
        const isCurrentlyPulsing = isPulsing && filled

        return (
          <div key={i} className="relative aspect-square flex items-center justify-center">
            <div
              className={cn(
                'w-full h-full rounded-full flex items-center justify-center font-semibold transition-all duration-300',
                sizeClasses,
                isNew && 'stamp-dot-fill scale-105',
                isCurrentlyPulsing && 'stamp-dot-pulse'
              )}
              style={
                filled
                  ? {
                      background: primaryColor,
                      color: textOnPrimaryColor,
                      boxShadow: `0 2px 10px ${primaryColor}40`,
                    }
                  : {
                      background: emptyStampColor,
                      border: `2px solid ${emptyStampBorderColor}`,
                      color: cardMutedTextColor,
                    }
              }
            >
              {filled ? (
                <Check size={iconSize} weight="bold" />
              ) : (
                <span className="text-[10px] opacity-45 font-mono tracking-tight">{i + 1}</span>
              )}
            </div>

            {isRippling && (
              <div
                className="stamp-dot-ripple absolute inset-0 rounded-full pointer-events-none"
                style={{ border: `2px solid ${primaryColor}`, opacity: 1 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
