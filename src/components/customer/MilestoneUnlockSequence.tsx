'use client'

import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Trophy } from '@phosphor-icons/react'

interface MilestoneUnlockSequenceProps {
  badge: string
  rewardTitle: string
  primaryBrandColor: string
  cardMutedTextColor: string
  isBrandingEnabled: boolean
  triggerUnlock?: boolean
  onUnlockComplete?: () => void
}

/**
 * MilestoneUnlockSequence:
 * Microinteraction sequence when a milestone transitions from locked -> earned.
 *
 * Requirements:
 * STEP 2 — Gift / trophy pop (~120–420ms):
 *   scale 0.7 -> 1.12 -> 1, opacity 0 -> 1, spring (stiffness: 360, damping: 22, mass: 0.75), rotate -4deg -> 3deg -> 0deg
 * STEP 3 — Reward halo (~200–500ms):
 *   subtle ring/glow behind milestone, opacity & scale, disappears after reveal
 * STEP 4 — Actual reward reveal (~320–650ms):
 *   transition from "Surprise reward" to actual configured reward title
 *   opacity: 0 -> 1, translateY: 6px -> 0, scale: 0.97 -> 1, duration 250-300ms ease-out
 * STEP 5 — Earned status (~450–750ms):
 *   Fade/slide in "Earned" badge
 * Total experience: 600–800ms (never exceed 1s), card static after ~800ms.
 * Reduced motion: simple ~150ms opacity transition, no bounce, no rotation, no halo.
 */
export default function MilestoneUnlockSequence({
  badge,
  rewardTitle,
  primaryBrandColor,
  cardMutedTextColor,
  isBrandingEnabled,
  triggerUnlock = false,
  onUnlockComplete,
}: MilestoneUnlockSequenceProps) {
  const shouldReduceMotion = useReducedMotion()
  const [prevTrigger, setPrevTrigger] = useState(triggerUnlock)
  const [activeUnlock, setActiveUnlock] = useState(triggerUnlock)

  if (triggerUnlock !== prevTrigger) {
    setPrevTrigger(triggerUnlock)
    setActiveUnlock(triggerUnlock)
  }

  useEffect(() => {
    if (!activeUnlock) return
    const timer = setTimeout(() => {
      setActiveUnlock(false)
      onUnlockComplete?.()
    }, 800)
    return () => clearTimeout(timer)
  }, [activeUnlock, onUnlockComplete])

  // Reduced motion: instantaneous / simple 150ms opacity transition
  if (shouldReduceMotion) {
    return (
      <div
        data-testid="milestone-unlocked-row"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-opacity duration-150"
        style={{
          background: isBrandingEnabled && primaryBrandColor ? primaryBrandColor + '1A' : 'rgba(245, 158, 11, 0.10)',
        }}
      >
        <div className="shrink-0 text-amber-400">
          <Trophy size={16} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: primaryBrandColor }}>
            {badge}
          </p>
          <p className="text-[11px] truncate" style={{ color: cardMutedTextColor + 'bb' }}>
            {rewardTitle}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: isBrandingEnabled && primaryBrandColor ? primaryBrandColor + '26' : 'rgba(245, 158, 11, 0.15)',
              color: primaryBrandColor,
            }}
          >
            Earned
          </span>
        </div>
      </div>
    )
  }

  // If unlock animation is NOT actively playing (e.g. already earned on load or finished),
  // render completely static layout with zero continuous animations.
  if (!activeUnlock) {
    return (
      <div
        data-testid="milestone-unlocked-row"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2"
        style={{
          background: isBrandingEnabled && primaryBrandColor ? primaryBrandColor + '1A' : 'rgba(245, 158, 11, 0.10)',
        }}
      >
        <div className="shrink-0 text-amber-400">
          <Trophy size={16} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: primaryBrandColor }}>
            {badge}
          </p>
          <p className="text-[11px] truncate" style={{ color: cardMutedTextColor + 'bb' }}>
            {rewardTitle}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: isBrandingEnabled && primaryBrandColor ? primaryBrandColor + '26' : 'rgba(245, 158, 11, 0.15)',
              color: primaryBrandColor,
            }}
          >
            Earned
          </span>
        </div>
      </div>
    )
  }

  // Active Unlock Animation Sequence: 0ms -> 800ms
  return (
    <div
      data-testid="milestone-unlocked-row"
      className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 overflow-hidden"
      style={{
        background: isBrandingEnabled && primaryBrandColor ? primaryBrandColor + '1A' : 'rgba(245, 158, 11, 0.10)',
      }}
    >
      {/* STEP 3: Halo glow behind milestone (200-500ms), then disappears */}
      <motion.div
        data-testid="milestone-unlock-halo"
        aria-hidden="true"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${primaryBrandColor}66 0%, ${primaryBrandColor}00 70%)`,
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{
          opacity: [0, 0.85, 0],
          scale: [0.6, 1.4, 1.8],
        }}
        transition={{
          delay: 0.2,
          duration: 0.35,
          ease: 'easeOut',
        }}
      />

      {/* STEP 2: Trophy pop (120-420ms) */}
      <motion.div
        data-testid="milestone-trophy-pop"
        className="shrink-0 text-amber-400 relative z-10"
        initial={{ scale: 0.7, opacity: 0, rotate: -4 }}
        animate={{
          scale: [0.7, 1.12, 1],
          opacity: 1,
          rotate: [-4, 3, 0],
        }}
        transition={{
          delay: 0.12,
          duration: 0.35,
          type: 'spring',
          stiffness: 360,
          damping: 22,
          mass: 0.75,
        }}
      >
        <Trophy size={16} weight="duotone" />
      </motion.div>

      {/* Title & STEP 4: Reward Title reveal (320-620ms) */}
      <div className="flex-1 min-w-0 relative z-10">
        <p className="text-xs font-medium truncate" style={{ color: primaryBrandColor }}>
          {badge}
        </p>
        <motion.p
          data-testid="milestone-reward-title-reveal"
          className="text-[11px] truncate"
          style={{ color: cardMutedTextColor + 'bb' }}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.32,
            duration: 0.28,
            ease: 'easeOut',
          }}
        >
          {rewardTitle}
        </motion.p>
      </div>

      {/* STEP 5: Earned status badge (450-750ms) */}
      <motion.div
        data-testid="milestone-earned-badge"
        className="text-right shrink-0 relative z-10"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: 0.45,
          duration: 0.28,
          ease: 'easeOut',
        }}
      >
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
          style={{
            background: isBrandingEnabled && primaryBrandColor ? primaryBrandColor + '26' : 'rgba(245, 158, 11, 0.15)',
            color: primaryBrandColor,
          }}
        >
          Earned
        </span>
      </motion.div>
    </div>
  )
}
