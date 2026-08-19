import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { fontBody } from './fonts'
import { C } from './colors'

interface CaptionProps {
  text: string
  startFrame: number
  endFrame: number
  size?: number
  color?: string
  align?: 'left' | 'center' | 'right'
}

export function Caption({ text, startFrame, endFrame, size = 28, color = C.textMuted, align = 'center' }: CaptionProps) {
  const frame = useCurrentFrame()

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 12, endFrame - 12, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const y = interpolate(
    frame,
    [startFrame, startFrame + 12],
    [8, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: fontBody,
        fontSize: size,
        color,
        textAlign: align,
        letterSpacing: '0.01em',
      }}
    >
      {text}
    </div>
  )
}
