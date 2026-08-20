'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { MilestoneWithStatus, RewardResult } from '@/types'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { resolveBrandingColors } from '@/lib/branding/palette'
import { Trophy, LockKey, Gift, Check, X, Tag } from '@phosphor-icons/react'

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
  branding?: import('@/types').BusinessBranding | null
  businessBranding?: import('@/types').BusinessBranding | null
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
        background: 'var(--is-border, rgba(255,255,255,0.08))',
        borderRadius: 9999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'var(--is-accent, #F59E0B)',
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
  useEffect(() => { onDismissRef.current = onDismiss })

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
  }, [])

  const badge = rewardResult.milestone?.badge ?? ''
  const milestoneReward = rewardResult.milestone?.reward ?? ''

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative p-3.5 rounded-lg text-center mb-3 border border-amber-500/30 bg-amber-500/10 transition-all duration-300 shadow-xs"
      style={{
        opacity: visible && !exiting ? 1 : 0,
        transform: exiting
          ? 'translateY(-6px)'
          : visible
          ? 'translateY(0)'
          : 'translateY(-6px)',
      }}
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss milestone celebration"
        className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1 rounded"
      >
        <X size={13} />
      </button>

      <div className="flex justify-center mb-1.5 text-amber-400" aria-hidden="true">
        <Trophy size={22} weight="duotone" />
      </div>

      <p className="font-semibold text-sm text-amber-400 tracking-tight mb-0.5">
        {badge} Milestone Unlocked!
      </p>

      <p className="text-xs text-zinc-100 font-medium mb-0.5">
        {milestoneReward}
      </p>

      <p className="text-[10px] text-zinc-400">
        Show this to staff to claim your milestone reward
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
    ? `${rewardResult.deferred_milestone.badge} milestone unlocks on your next visit!`
    : 'Stamp card completes on your next visit!'

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 p-2 rounded-md border border-amber-500/20 bg-amber-500/10 text-xs text-amber-300 transition-all duration-200"
      style={{
        opacity: visible && !exiting ? 1 : 0,
        transform: exiting ? 'translateY(-4px)' : visible ? 'translateY(0)' : 'translateY(-4px)',
      }}
    >
      <Tag size={15} weight="duotone" className="text-amber-400 shrink-0" />
      <span className="flex-1 text-[11px]">{msg}</span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="text-amber-400/80 hover:text-amber-200 cursor-pointer p-0.5"
      >
        <X size={12} />
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
  branding,
  businessBranding,
}: StampCardProps) {
  const [rippleIndex, setRippleIndex] = useState<number | null>(null)
  const [celebrateAll, setCelebrateAll] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [deferredDismissed, setDeferredDismissed] = useState(false)
  const prevStamps = useRef(cardStamps)

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
      startTransition(() => setShowClaim(true))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const activeBranding = businessBranding || branding
  const isBrandingEnabled = !!(activeBranding && activeBranding.is_enabled !== false)

  const resolved = resolveBrandingColors(activeBranding, isBrandingEnabled)
  const cardBgColor = resolved.surface_color
  const primaryBrandColor = resolved.primary_color
  const textOnPrimaryBrandColor = resolved.text_on_primary

  const visitsRemaining = Math.max(0, stampsRequired - cardStamps)
  
  // Compact column layout:
  // Thresholds <= 6 fit in a single row on 375px+ screens
  const cols =
    stampsRequired <= 6
      ? stampsRequired
      : stampsRequired <= 8
      ? 4
      : stampsRequired <= 10
      ? 5
      : 6

  return (
    <div
      className={cn(
        'rounded-xl p-4 sm:p-5 border transition-all duration-300 shadow-xs relative overflow-hidden',
        redeemable && 'is-reward-glow border-amber-500/40'
      )}
      style={{ background: cardBgColor, borderColor: resolved.empty_stamp_border_color }}
    >
      {/* ── Milestone celebration banner ── */}
      {activeMilestoneBanner && (
        <MilestoneBanner
          rewardResult={activeMilestoneBanner}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ── Header: Merchant & Reward Dominance ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <BusinessVisual
            logoUrl={activeBranding?.logo_url}
            emoji={businessEmoji}
            name={businessName}
            className="text-2xl shrink-0"
          />
          <div className="min-w-0">
            <h3
              className="font-semibold text-base leading-snug break-words"
              style={{ color: resolved.card_text_color }}
            >
              {businessName}
            </h3>
            <p
              className="text-xs font-medium mt-0.5"
              style={{ color: resolved.card_muted_text_color }}
            >
              {reward}
            </p>
          </div>
        </div>

        {totalVisits !== undefined && totalVisits > 0 && (
          <span
            className="text-[10px] font-mono shrink-0 pt-0.5"
            style={{ color: resolved.card_muted_text_color }}
          >
            {totalVisits} {totalVisits === 1 ? 'visit' : 'visits'}
          </span>
        )}
      </div>

      {/* ── Progress Hierarchy: Single, Non-Duplicated Readout ── */}
      <div className="mb-2">
        <h4
          className="text-sm font-semibold tracking-tight"
          style={{ color: resolved.card_text_color }}
        >
          {cardStamps} of {stampsRequired} visits
        </h4>
        <p className="text-[11px] mt-0.5" style={{ color: resolved.card_muted_text_color }}>
          {visitsRemaining === 0
            ? 'Your reward is ready to redeem!'
            : `${visitsRemaining} ${visitsRemaining === 1 ? 'visit' : 'visits'} to your reward`}
        </p>
      </div>

      {/* ── Stamp Grid: Compact, Tactile Circular Punch Trail ── */}
      <div
        className="grid gap-2 my-3 select-none justify-center"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        aria-label={`${cardStamps} of ${stampsRequired} stamps collected`}
        role="img"
      >
        {Array.from({ length: stampsRequired }).map((_, i) => {
          const filled = i < cardStamps
          const isNew = i === newStampIndex
          const isRippling = i === rippleIndex
          const isPulsing = celebrateAll && filled

          return (
            <div key={i} className="relative aspect-square flex items-center justify-center max-w-[44px] max-h-[44px] mx-auto w-full">
              <div
                className={cn(
                  'w-full h-full rounded-full flex items-center justify-center text-xs font-semibold transition-transform duration-200 select-none max-w-[44px] max-h-[44px]',
                  isNew && 'stamp-dot-fill scale-105',
                  isPulsing && 'stamp-dot-pulse'
                )}
                style={
                  filled
                    ? {
                        background: primaryBrandColor,
                        color: textOnPrimaryBrandColor,
                        boxShadow: `0 1px 6px ${isBrandingEnabled ? primaryBrandColor + '30' : 'rgba(245, 158, 11, 0.20)'}`,
                      }
                    : {
                        background: resolved.empty_stamp_color,
                        border: `2px solid ${resolved.empty_stamp_border_color}`,
                        color: resolved.card_muted_text_color,
                      }
                }
              >
                {filled ? (
                  <Check size={15} weight="bold" />
                ) : (
                  <span className="text-[10px] opacity-40 font-mono">{i + 1}</span>
                )}
              </div>

              {isRippling && (
                <div
                  className="stamp-dot-ripple absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: `2px solid ${primaryBrandColor}`, opacity: 1 }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Claim reward button ── */}
      {showClaim && onClaim && (
        <button
          onClick={onClaim}
          className="claim-btn-enter glow-pulse mt-3 w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-lg text-sm transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-sm"
          style={{ background: primaryBrandColor, color: textOnPrimaryBrandColor, minHeight: 40 }}
        >
          <Gift size={16} weight="fill" />
          <span>Claim {reward}</span>
        </button>
      )}

      {/* ── Deferred notification ── */}
      {showDeferred && (
        <div className="mt-2.5">
          <DeferredNotification
            rewardResult={rewardResult!}
            onDismiss={() => setDeferredDismissed(true)}
          />
        </div>
      )}

      {/* ── Milestones section ── */}
      {sortedMilestones.length > 0 && (
        <div className="mt-4">
          <div
            style={{ height: 1, background: resolved.empty_stamp_border_color, marginBottom: 10 }}
          />

          <p
            className="text-[10px] font-semibold tracking-wider uppercase mb-2"
            style={{ color: resolved.card_muted_text_color }}
          >
            Milestone Rewards
          </p>

          <div className="space-y-2">
            {sortedMilestones.map((m) => {
              const pct =
                totalVisits != null
                  ? Math.min(100, (totalVisits / m.visit_number) * 100)
                  : 0
              const visitsAway = Math.max(0, m.visit_number - (totalVisits ?? 0))

              return (
                <div key={m.id}>
                  <div
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5"
                    style={{
                      background: m.earned 
                        ? (isBrandingEnabled && resolved.primary_color ? resolved.primary_color + '1A' : 'rgba(245, 158, 11, 0.10)') 
                        : 'transparent',
                    }}
                  >
                    <div className="shrink-0">
                      {m.earned ? (
                        <Trophy size={16} weight="duotone" className="text-amber-400" />
                      ) : (
                        <LockKey size={16} className="text-zinc-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{
                          color: m.earned ? primaryBrandColor : resolved.card_muted_text_color,
                        }}
                      >
                        {m.badge}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: resolved.card_muted_text_color + 'bb' }}
                      >
                        {m.reward}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {m.earned ? (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: isBrandingEnabled && resolved.primary_color ? resolved.primary_color + '26' : 'rgba(245, 158, 11, 0.15)',
                            color: primaryBrandColor,
                          }}
                        >
                          Earned
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: resolved.card_muted_text_color }}
                        >
                          {visitsAway} {visitsAway === 1 ? 'visit' : 'visits'} left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress towards milestone */}
                  {!m.earned && totalVisits != null && (
                    <div className="mt-0.5 px-2.5">
                      <MilestoneProgressBar pct={pct} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Subtle Platform Attribution ── */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex justify-center text-center">
        <p className="text-[10px] text-zinc-500 font-normal">
          by{' '}
          <a
            href="https://intellicallabs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors font-medium underline decoration-zinc-700"
          >
            Intellical Labs
          </a>
        </p>
      </div>
    </div>
  )
}
