'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Gift } from '@phosphor-icons/react'

interface MilestoneGiftMarkerProps {
  /** Size in pixels (default: 13) */
  size?: number
  /** Whether the associated milestone is earned */
  isEarned?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * MilestoneGiftMarker:
 * Small Gift icon associated with a milestone circle.
 *
 * Requirements:
 * - On FIRST appearance:
 *   scale: 0.85 -> 1.08 -> 1
 *   rotate: -5deg -> 5deg -> 0deg
 *   duration: ~400-500ms
 *   subtle spring, no layout movement
 * - Afterwards:
 *   Subtle attention pulse repeating every 7s while locked:
 *   scale: 1 -> 1.06 -> 1
 *   (No continuous bounce/rotate)
 * - Stop all attention animation once earned
 * - Reduced motion:
 *   Disable rotation, spring bounce, and repeating pulse
 */
export default function MilestoneGiftMarker({
  size = 13,
  isEarned = false,
  className,
  style,
}: MilestoneGiftMarkerProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <span
        data-testid="milestone-gift-marker"
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
      >
        <Gift size={size} weight="fill" />
      </span>
    )
  }

  // Once earned, stop all pulse and remain static
  if (isEarned) {
    return (
      <span
        data-testid="milestone-gift-marker"
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
      >
        <Gift size={size} weight="fill" />
      </span>
    )
  }

  return (
    <motion.span
      data-testid="milestone-gift-marker"
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        ...style,
      }}
      initial={{ scale: 0.85, rotate: -5 }}
      animate={{
        // Intro keyframes: 0.85 -> 1.08 -> 1, then locked attention pulse every ~7 seconds: 1 -> 1.06 -> 1
        scale: [0.85, 1.08, 1, 1, 1.06, 1],
        rotate: [-5, 5, 0, 0, 0, 0],
      }}
      transition={{
        duration: 7,
        times: [0, 0.035, 0.07, 0.93, 0.965, 1], // 0-490ms intro, idle until 6510ms, 490ms pulse, repeats
        repeat: Infinity,
        ease: 'easeOut',
      }}
    >
      <Gift size={size} weight="fill" />
    </motion.span>
  )
}
