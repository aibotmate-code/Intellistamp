import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../components/colors'
import { fontDisplay, fontBody } from '../components/fonts'

export function HookScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, from: 0.7, to: 1 })
  const logoOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

  const textOpacity = interpolate(frame, [14, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const textY       = interpolate(frame, [14, 26], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const subOpacity = interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 64 }}>🏷️</span>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 56,
            color: C.text,
            letterSpacing: '0.12em',
          }}
        >
          IntelliStamp
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: 'center',
          maxWidth: 900,
        }}
      >
        <p
          style={{
            fontFamily: fontDisplay,
            fontSize: 72,
            color: C.text,
            letterSpacing: '0.04em',
            lineHeight: 1.1,
          }}
        >
          Turn every visit into a
        </p>
        <p
          style={{
            fontFamily: fontDisplay,
            fontSize: 72,
            color: C.gold,
            letterSpacing: '0.04em',
            lineHeight: 1.1,
          }}
        >
          reason to come back.
        </p>
      </div>

      {/* Sub-line */}
      <p
        style={{
          opacity: subOpacity,
          fontFamily: fontBody,
          fontSize: 24,
          color: C.textMuted,
          letterSpacing: '0.05em',
        }}
      >
        Digital loyalty for local businesses · No app needed
      </p>
    </div>
  )
}
