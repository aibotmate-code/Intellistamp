import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../../components/colors'
import { fontDisplay, fontBody } from '../../components/fonts'

export function HookSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 140 }, from: 0.65, to: 1 })
  const logoOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

  const headlineOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const headlineY       = interpolate(frame, [10, 20], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const gold2Opacity = interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const gold2Y       = interpolate(frame, [18, 30], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const subOpacity = interpolate(frame, [30, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const pillOpacity = interpolate(frame, [50, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
        gap: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow behind headline */}
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${C.gold}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

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
        <span style={{ fontSize: 56 }}>🏷️</span>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 52,
            color: C.text,
            letterSpacing: '0.12em',
          }}
        >
          IntelliStamp
        </span>
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center', maxWidth: 960 }}>
        <p
          style={{
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            fontFamily: fontDisplay,
            fontSize: 88,
            color: C.text,
            letterSpacing: '0.03em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Turn every visit into
        </p>
        <p
          style={{
            opacity: gold2Opacity,
            transform: `translateY(${gold2Y}px)`,
            fontFamily: fontDisplay,
            fontSize: 88,
            color: C.gold,
            letterSpacing: '0.03em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          a reason to come back.
        </p>
      </div>

      {/* Sub-line */}
      <p
        style={{
          opacity: subOpacity,
          fontFamily: fontBody,
          fontSize: 26,
          color: C.textMuted,
          letterSpacing: '0.04em',
          margin: 0,
        }}
      >
        Digital loyalty for local businesses — no app needed
      </p>

      {/* Proof pills */}
      <div
        style={{
          opacity: pillOpacity,
          display: 'flex',
          gap: 16,
          marginTop: 8,
        }}
      >
        {['Scan QR · enter phone · done', 'Milestone rewards', 'Real-time dashboard'].map((t) => (
          <div
            key={t}
            style={{
              fontFamily: fontBody,
              fontSize: 14,
              color: C.textMuted,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: '8px 20px',
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}
