import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

interface CursorProps {
  x: number
  y: number
  clickAt?: number
}

export function Cursor({ x, y, clickAt }: CursorProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const clickFrame = clickAt ?? -1
  const timeSinceClick = frame - clickFrame

  const ringScale = clickFrame >= 0 && timeSinceClick >= 0
    ? spring({ frame: timeSinceClick, fps, config: { damping: 20, stiffness: 120 }, from: 0.4, to: 2.2 })
    : 0
  const ringOpacity = clickFrame >= 0 && timeSinceClick >= 0
    ? interpolate(timeSinceClick, [0, 20], [0.8, 0], { extrapolateRight: 'clamp' })
    : 0

  const dotScale = clickFrame >= 0 && timeSinceClick >= 0 && timeSinceClick < 8
    ? spring({ frame: timeSinceClick, fps, config: { damping: 10, stiffness: 300 }, from: 1, to: 0.6 })
    : 1

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 100,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Click ripple ring */}
      <div
        style={{
          position: 'absolute',
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2px solid rgba(234,179,8,0.9)',
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity,
          left: 0,
          top: 0,
        }}
      />
      {/* Cursor dot */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(234,179,8,0.95)',
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          transform: `translate(-50%, -50%) scale(${dotScale})`,
          position: 'absolute',
          left: 0,
          top: 0,
        }}
      />
    </div>
  )
}
