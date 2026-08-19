import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../../components/colors'
import { fontDisplay, fontBody } from '../../components/fonts'

export function FinalSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, from: 0.7, to: 1 })
  const logoOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  const taglineOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const taglineY       = interpolate(frame, [18, 32], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const byOpacity = interpolate(frame, [32, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // CTA comes in earlier, holds the full final 3s (90 frames)
  const ctaOpacity = interpolate(frame, [46, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // CTA pulse at full opacity — subtle scale loop to keep attention
  const ctaPulsePhase = Math.max(0, frame - 65)
  const ctaScale = ctaOpacity >= 1
    ? 1 + 0.012 * Math.sin((ctaPulsePhase / 30) * Math.PI * 2)
    : 1

  const glowOpacity = interpolate(frame, [5, 30], [0, 0.14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
        gap: 26,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
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
          gap: 22,
        }}
      >
        <span style={{ fontSize: 80 }}>🏷️</span>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 90,
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
            fontSize: 40,
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
          fontSize: 20,
          color: C.textMuted,
          letterSpacing: '0.06em',
          margin: 0,
        }}
      >
        by Intellical Labs
      </p>

      {/* CTA — larger URL, holds for ~3 seconds */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          marginTop: 28,
          background: C.gold,
          borderRadius: 16,
          padding: '20px 52px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 28,
            fontWeight: 700,
            color: '#000',
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          stamp.intellicallabs.com
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 15, color: '#0009', margin: 0 }}>
          Start free · No credit card required
        </p>
      </div>
    </div>
  )
}
