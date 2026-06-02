'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { MilestoneWithStatus, RewardResult } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  // v2 additions
  milestones?: MilestoneWithStatus[]
  rewardResult?: RewardResult | null
  totalVisits?: number
}

// ── Milestone progress bar — animates 0→pct on mount ─────────────────────────

function MilestoneProgressBar({ pct }: { pct: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(Math.min(100, pct)))
    return () => cancelAnimationFrame(raf)
  }, [pct])

  return (
    <div
      style={{
        height: 3,
        background: 'var(--color-border)',
        borderRadius: 9999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'oklch(0.55 0.12 280)',
          borderRadius: 9999,
          transition: 'width 800ms ease-out',
        }}
      />
    </div>
  )
}

// ── Milestone celebration banner ───────────────────────────────────────────────

function MilestoneBanner({
  rewardResult,
  onDismiss,
}: {
  rewardResult: RewardResult
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismissRef.current(), 180)
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(handleDismiss, 8000)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const badge = rewardResult.milestone?.badge ?? ''
  const milestoneReward = rewardResult.milestone?.reward ?? ''

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        background: 'oklch(0.13 0.04 55)',
        border: '1px solid oklch(0.28 0.10 55)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        textAlign: 'center',
        marginBottom: 16,
        opacity: visible && !exiting ? 1 : 0,
        transform: exiting
          ? 'translateY(-10px)'
          : visible
          ? 'translateY(0)'
          : 'translateY(-8px)',
        transition: exiting
          ? 'opacity 180ms ease, transform 180ms ease'
          : 'opacity 300ms cubic-bezier(0.32,0.72,0,1), transform 300ms cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss milestone celebration"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 16,
          lineHeight: 1,
          minWidth: 28,
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
        }}
      >
        ✕
      </button>

      {/* Trophy — scale-in from animations.css */}
      <div
        className="scale-in"
        style={{ fontSize: 32, lineHeight: 1, marginBottom: 10 }}
        aria-hidden="true"
      >
        🏆
      </div>

      {/* Badge name */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: 'var(--color-gold)',
          lineHeight: 1.1,
          marginBottom: 6,
          opacity: 0,
          transform: 'translateY(8px)',
          animation: 'fadeUp 300ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)) 100ms forwards',
        }}
      >
        {badge} UNLOCKED!
      </p>

      {/* Reward text */}
      <p
        style={{
          fontSize: 14,
          color: 'var(--color-text)',
          marginBottom: 4,
          opacity: 0,
          transform: 'translateY(8px)',
          animation: 'fadeUp 300ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)) 200ms forwards',
        }}
      >
        {milestoneReward}
      </p>

      {/* Instruction */}
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-muted)',
          opacity: 0,
          transform: 'translateY(8px)',
          animation: 'fadeUp 300ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)) 300ms forwards',
        }}
      >
        Show this to staff to claim
      </p>
    </div>
  )
}

// ── Deferred reward notification ───────────────────────────────────────────────

function DeferredNotification({
  rewardResult,
  onDismiss,
}: {
  rewardResult: RewardResult
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 200)
  }

  const msg = rewardResult.deferred_milestone
    ? `🏆 ${rewardResult.deferred_milestone.badge} milestone unlocks on your next visit!`
    : '🔖 Stamp card completes on your next visit!'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'oklch(0.15 0.04 55)',
        border: '1px solid oklch(0.28 0.08 55)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: 13,
        color: 'oklch(0.72 0.12 55)',
        opacity: visible && !exiting ? 1 : 0,
        transform:
          exiting ? 'translateY(-4px)' : visible ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
    >
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'oklch(0.55 0.08 55)',
          fontSize: 14,
          lineHeight: 1,
          minWidth: 28,
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderRadius: 4,
        }}
      >
        ✕
      </button>
    </div>
  )
}

// ── Main StampCard ────────────────────────────────────────────────────────────

export default function StampCard({
  stampsRequired,
  cardStamps,
  businessName,
  businessEmoji,
  reward,
  newStampIndex,
  onClaim,
  redeemable,
  milestones,
  rewardResult,
  totalVisits,
}: StampCardProps) {
  const [rippleIndex, setRippleIndex] = useState<number | null>(null)
  const [celebrateAll, setCelebrateAll] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [deferredDismissed, setDeferredDismissed] = useState(false)
  const prevStamps = useRef(cardStamps)

  // Existing stamp animation logic — unchanged
  useEffect(() => {
    const prev = prevStamps.current
    prevStamps.current = cardStamps

    if (newStampIndex !== undefined && cardStamps > prev) {
      setRippleIndex(newStampIndex)
      setTimeout(() => setRippleIndex(null), 400)

      if (redeemable) {
        setTimeout(() => {
          setCelebrateAll(true)
          setTimeout(() => setCelebrateAll(false), 300)
        }, 300)
        setTimeout(() => setShowClaim(true), 650)
      }
    }
  }, [cardStamps, newStampIndex, redeemable])

  useEffect(() => {
    if (redeemable && newStampIndex === undefined) {
      setShowClaim(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived
  const sortedMilestones = milestones
    ? [...milestones].sort((a, b) => a.visit_number - b.visit_number)
    : []

  const activeMilestoneBanner =
    rewardResult?.type === 'milestone' && !bannerDismissed ? rewardResult : null

  const showDeferred =
    !deferredDismissed &&
    rewardResult != null &&
    (rewardResult.deferred_milestone != null || rewardResult.deferred_stamp === true)

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* ── Milestone celebration banner — ABOVE stamp dots ── */}
      {activeMilestoneBanner && (
        <MilestoneBanner
          rewardResult={activeMilestoneBanner}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{businessEmoji}</span>
        <div>
          <h3
            className="font-bold text-lg leading-tight"
            style={{ color: 'var(--color-text)' }}
          >
            {businessName}
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Collect {stampsRequired} stamps → {reward}
          </p>
        </div>
      </div>

      {/* ── Stamp dot grid ── */}
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
                        border: '2px solid var(--color-border)',
                        color: 'var(--color-text-dim)',
                        minWidth: 48,
                        minHeight: 48,
                      }
                }
              >
                {filled ? '✓' : ''}
              </div>

              {isRippling && (
                <div
                  className="stamp-dot-ripple absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: '2px solid var(--color-gold)', opacity: 1 }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between mt-4">
        <span
          className="text-sm font-medium count-up"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {cardStamps}/{stampsRequired} stamps
          {totalVisits !== undefined && (
            <span style={{ color: 'var(--color-text-dim)' }}>
              {' '}· {totalVisits} total visits
            </span>
          )}
        </span>
      </div>

      {/* ── Claim reward button ── */}
      {showClaim && onClaim && (
        <button
          onClick={onClaim}
          className="btn btn-primary claim-btn-enter glow-pulse mt-4 w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-base"
          style={{ background: 'var(--color-gold)', color: '#000', minHeight: 48 }}
        >
          🎁 CLAIM REWARD
        </button>
      )}

      {/* ── Deferred reward notification — below stamps, above milestones ── */}
      {showDeferred && (
        <div className="mt-3">
          <DeferredNotification
            rewardResult={rewardResult!}
            onDismiss={() => setDeferredDismissed(true)}
          />
        </div>
      )}

      {/* ── Milestones section ── */}
      {sortedMilestones.length > 0 && (
        <div className="mt-4">
          {/* Divider */}
          <div
            style={{ height: 1, background: 'var(--color-border)', marginBottom: 12 }}
          />

          {/* Section label */}
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Milestones
          </p>

          <div className="space-y-3">
            {sortedMilestones.map(m => {
              const pct =
                totalVisits != null
                  ? Math.min(100, (totalVisits / m.visit_number) * 100)
                  : 0
              const visitsAway = Math.max(0, m.visit_number - (totalVisits ?? 0))

              return (
                <div key={m.id}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{
                      background: m.earned ? 'oklch(0.13 0.03 55)' : 'transparent',
                    }}
                  >
                    {/* Icon */}
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 20,
                        lineHeight: 1,
                        flexShrink: 0,
                        filter: m.earned
                          ? 'drop-shadow(0 0 6px oklch(0.72 0.18 55 / 0.5))'
                          : undefined,
                      }}
                    >
                      {m.earned ? '🏆' : '🔒'}
                    </span>

                    {/* Badge + reward */}
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 15,
                          lineHeight: 1.2,
                          letterSpacing: '0.02em',
                          color: m.earned
                            ? 'var(--color-gold)'
                            : 'var(--color-text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.badge}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          marginTop: 2,
                          color: m.earned
                            ? 'var(--color-text-muted)'
                            : 'var(--color-text-dim)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.reward}
                      </p>
                    </div>

                    {/* Status */}
                    {m.earned ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--color-gold)',
                          background: 'var(--color-gold-bg)',
                          border: '1px solid var(--color-gold-border)',
                          borderRadius: 9999,
                          padding: '3px 10px',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Earned ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--color-text-dim)',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {visitsAway} visit{visitsAway !== 1 ? 's' : ''} away
                      </span>
                    )}
                  </div>

                  {/* Progress bar — locked milestones only */}
                  {!m.earned && (
                    <div className="px-3 mt-1">
                      <MilestoneProgressBar pct={pct} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
