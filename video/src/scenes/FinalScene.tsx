import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../components/colors'
import { fontDisplay, fontBody } from '../components/fonts'

export function FinalScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, from: 0.7, to: 1 })
  const logoOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' })

  const taglineOpacity = interpolate(frame, [22, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const taglineY       = interpolate(frame, [22, 38], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const byOpacity = interpolate(frame, [38, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const ctaOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Subtle gold gradient sweep behind the logo
  const glowOpacity = interpolate(frame, [5, 30], [0, 0.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
        gap: 28,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.gold} 0%, transparent 70%)`,
          opacity: glowOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <span style={{ fontSize: 72 }}>🏷️</span>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 80,
            color: C.text,
            letterSpacing: '0.12em',
          }}
        >
          IntelliStamp
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 36,
            color: C.gold,
            fontWeight: 700,
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          Turn visits into loyalty.
        </p>
      </div>

      {/* By line */}
      <p
        style={{
          opacity: byOpacity,
          fontFamily: fontBody,
          fontSize: 18,
          color: C.textMuted,
          letterSpacing: '0.06em',
          margin: 0,
        }}
      >
        by Intellical Labs
      </p>

      {/* CTA */}
      <div
        style={{
          opacity: ctaOpacity,
          marginTop: 24,
          background: C.gold,
          borderRadius: 14,
          padding: '16px 44px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 22,
            fontWeight: 700,
            color: '#000',
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          stamp.intellicallabs.com
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: '#0009', margin: 0 }}>
          Start free · No credit card required
        </p>
      </div>
    </div>
  )
}
