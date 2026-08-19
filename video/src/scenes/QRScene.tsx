import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { QRPattern } from '../components/QRPattern'
import { C } from '../components/colors'
import { fontDisplay, fontBody } from '../components/fonts'

const BUSINESS_NAME = 'CRESTA BAKERY'
const BUSINESS_EMOJI = '🥐'
const TOKEN = 'X7K3P2'

export function QRScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const contentScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, from: 0.85, to: 1 })
  const contentOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  // Phone icon approaching from right
  const phoneX = interpolate(frame, [50, 90], [500, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  })
  const phoneOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Countdown - simulate 42→20 over the scene
  const seconds = Math.max(10, Math.round(42 - (frame / 180) * 22))
  const dotColor = seconds > 10 ? '#4ade80' : C.red

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '60px 80px',
        position: 'relative',
      }}
    >
      {/* Exit button */}
      <div style={{ position: 'absolute', top: 20, right: 30 }}>
        <button
          style={{
            fontFamily: fontBody,
            fontSize: 13,
            color: C.textMuted,
            background: 'none',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '6px 14px',
          }}
        >
          ✕ Exit
        </button>
      </div>

      {/* Top: business identity */}
      <div
        style={{
          opacity: contentOpacity,
          transform: `scale(${contentScale})`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 10 }}>{BUSINESS_EMOJI}</div>
        <p
          style={{
            fontFamily: fontDisplay,
            fontSize: 52,
            color: C.textMuted,
            letterSpacing: '0.2em',
          }}
        >
          {BUSINESS_NAME}
        </p>
      </div>

      {/* Center: QR + token */}
      <div
        style={{
          opacity: contentOpacity,
          transform: `scale(${contentScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          position: 'relative',
        }}
      >
        <div style={{ boxShadow: '0 20px 80px rgba(0,0,0,0.5)', borderRadius: 20 }}>
          <QRPattern size={300} />
        </div>

        <p
          style={{
            fontFamily: fontDisplay,
            fontSize: 80,
            letterSpacing: '0.3em',
            color: C.gold,
            textAlign: 'center',
          }}
        >
          {TOKEN}
        </p>

        {/* Approaching phone emoji */}
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: '40%',
            transform: `translateX(${phoneX}px)`,
            opacity: phoneOpacity,
          }}
        >
          <span style={{ fontSize: 72 }}>📱</span>
        </div>
      </div>

      {/* Bottom: instructions */}
      <div style={{ opacity: contentOpacity, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontFamily: fontBody, fontSize: 22, color: C.text, fontWeight: 500 }}>
          Scan with your phone to collect a stamp
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: dotColor,
            }}
          />
          <span style={{ fontFamily: fontBody, fontSize: 15, color: seconds > 10 ? C.textMuted : C.red }}>
            Refreshes in {seconds}s
          </span>
        </div>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim }}>
          Powered by IntelliStamp · stamp.intellicallabs.com
        </p>
      </div>
    </div>
  )
}
