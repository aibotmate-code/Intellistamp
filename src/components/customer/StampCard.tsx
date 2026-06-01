'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface StampCardProps {
  stampsRequired: number
  cardStamps: number
  businessName: string
  businessEmoji: string
  reward: string
  /** Index (0-based) of the stamp that was just added this render */
  newStampIndex?: number
  onClaim?: () => void
  redeemable?: boolean
}

export default function StampCard({
  stampsRequired,
  cardStamps,
  businessName,
  businessEmoji,
  reward,
  newStampIndex,
  onClaim,
  redeemable,
}: StampCardProps) {
  const [rippleIndex, setRippleIndex] = useState<number | null>(null)
  const [celebrateAll, setCelebrateAll] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const prevStamps = useRef(cardStamps)

  useEffect(() => {
    const prev = prevStamps.current
    prevStamps.current = cardStamps

    // New stamp just landed
    if (newStampIndex !== undefined && cardStamps > prev) {
      // Trigger ripple on new dot
      setRippleIndex(newStampIndex)
      setTimeout(() => setRippleIndex(null), 400)

      // Card complete sequence
      if (redeemable) {
        setTimeout(() => {
          setCelebrateAll(true)
          setTimeout(() => setCelebrateAll(false), 300)
        }, 300)
        setTimeout(() => setShowClaim(true), 650)
      }
    }
  }, [cardStamps, newStampIndex, redeemable])

  // If already redeemable on mount (no new stamp), show claim button immediately
  useEffect(() => {
    if (redeemable && newStampIndex === undefined) {
      setShowClaim(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{businessEmoji}</span>
        <div>
          <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text)' }}>
            {businessName}
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Collect {stampsRequired} stamps → {reward}
          </p>
        </div>
      </div>

      {/* Stamp dot grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(5, stampsRequired)}, 1fr)` }}
        aria-label={`${cardStamps} of ${stampsRequired} stamps collected`}
        role="img"
      >
        {Array.from({ length: stampsRequired }).map((_, i) => {
          const filled = i < cardStamps
          const isNew = i === newStampIndex
          const isRippling = i === rippleIndex
          const isPulsing = celebrateAll && filled

          return (
            <div key={i} className="relative aspect-square flex items-center justify-center">
              {/* Dot */}
              <div
                className={cn(
                  'w-full h-full rounded-full flex items-center justify-center text-sm font-bold',
                  isNew && 'stamp-dot-fill',
                  isPulsing && 'stamp-dot-pulse',
                )}
                style={
                  filled
                    ? {
                        background: 'var(--color-gold)',
                        color: '#000',
                        boxShadow: '0 2px 8px oklch(0.72 0.18 55 / 0.25)',
                        minWidth: 48,
                        minHeight: 48,
                      }
                    : {
                        background: 'var(--color-elevated)',
                        border: `2px solid var(--color-border)`,
                        color: 'var(--color-text-dim)',
                        minWidth: 48,
                        minHeight: 48,
                      }
                }
              >
                {filled ? '✓' : ''}
              </div>

              {/* Ripple ring */}
              {isRippling && (
                <div
                  className="stamp-dot-ripple absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    border: '2px solid var(--color-gold)',
                    opacity: 1,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm font-medium count-up" style={{ color: 'var(--color-text-muted)' }}>
          {cardStamps}/{stampsRequired} stamps
        </span>
      </div>

      {/* Claim reward button — slides up only after card completes */}
      {showClaim && onClaim && (
        <button
          onClick={onClaim}
          className="btn btn-primary claim-btn-enter glow-pulse mt-4 w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-base"
          style={{
            background: 'var(--color-gold)',
            color: '#000',
            minHeight: 48,
          }}
        >
          🎁 CLAIM REWARD
        </button>
      )}
    </div>
  )
}
