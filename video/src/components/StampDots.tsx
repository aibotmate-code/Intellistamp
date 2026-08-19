import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from './colors'

interface StampDotsProps {
  total: number
  filled: number
  newIndex?: number          // 0-based index of the stamp that just appeared
  animateAtFrame?: number    // frame at which the new stamp pops in
}

export function StampDots({ total, filled, newIndex, animateAtFrame = 0 }: StampDotsProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const cols = Math.min(6, total)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled
        const isNew    = i === newIndex

        const scale = isNew
          ? spring({
              frame: frame - animateAtFrame,
              fps,
              config: { damping: 12, stiffness: 200, mass: 0.6 },
              from: 0.4,
              to: 1,
            })
          : 1

        const opacity = interpolate(
          frame,
          [animateAtFrame, animateAtFrame + 8],
          [isFilled && isNew ? 0 : 1, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )

        return (
          <div
            key={i}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isFilled ? C.gold : C.elevated,
              border: isFilled ? 'none' : `2px solid ${C.border}`,
              color: isFilled ? '#000' : C.textDim,
              fontWeight: 700,
              fontSize: 20,
              transform: `scale(${scale})`,
              opacity,
              boxShadow: isFilled ? `0 2px 12px ${C.gold}55` : 'none',
              transition: 'background 0.2s',
            }}
          >
            {isFilled ? '✓' : ''}
          </div>
        )
      })}
    </div>
  )
}
