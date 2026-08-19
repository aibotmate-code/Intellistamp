import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../../components/colors'
import { fontBody, fontDisplay } from '../../components/fonts'
import { QRPattern } from '../../components/QRPattern'

function BrandCard({ label, value, delay }: { label: string; value: string; delay: number }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const y = interpolate(frame, [delay, delay + 14], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ opacity, transform: `translateY(${y}px)` }}>
      <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim, margin: '0 0 4px', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ fontFamily: fontBody, fontSize: 17, color: C.text, margin: 0, fontWeight: 600 }}>
        {value}
      </p>
    </div>
  )
}

export function BrandingSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })

  const kioskScale = spring({ frame, fps, config: { damping: 14, stiffness: 90 }, from: 0.88, to: 1 })
  const kioskOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' })

  // Zoom into kiosk after 2.5s
  const ZOOM_START = 75
  const ZOOM_END   = 115
  const kioskZoom = interpolate(frame, [ZOOM_START, ZOOM_END], [1, 1.14], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 70,
        padding: '50px 80px',
      }}
    >
      {/* Left: kiosk preview — 580px wide */}
      <div
        style={{
          opacity: kioskOpacity,
          transform: `scale(${kioskScale * kioskZoom})`,
          transformOrigin: 'center center',
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: '40px 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 580,
          height: 720,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          flexShrink: 0,
        }}
      >
        {/* Business */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 10 }}>🥐</div>
          <p
            style={{
              fontFamily: fontDisplay,
              fontSize: 42,
              color: C.textMuted,
              letterSpacing: '0.2em',
              margin: 0,
            }}
          >
            CRESTA BAKERY
          </p>
        </div>

        {/* QR + token */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <div style={{ boxShadow: '0 12px 50px rgba(0,0,0,0.5)', borderRadius: 18 }}>
            <QRPattern size={220} />
          </div>
          <p style={{ fontFamily: fontDisplay, fontSize: 60, letterSpacing: '0.3em', color: C.gold, margin: 0 }}>
            X7K3P2
          </p>
        </div>

        {/* Bottom */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontFamily: fontBody, fontSize: 17, color: C.text, fontWeight: 500, margin: 0 }}>
            Scan to collect a stamp
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted }}>Refreshes in 42s</span>
          </div>
          <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim, margin: 0 }}>
            Powered by IntelliStamp
          </p>
        </div>
      </div>

      {/* Right: brand config summary */}
      <div style={{ opacity, flex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <p style={{ fontFamily: fontBody, fontSize: 52, fontWeight: 900, color: C.text, lineHeight: 1.1, marginBottom: 10 }}>
            Your brand.
          </p>
          <p style={{ fontFamily: fontBody, fontSize: 52, fontWeight: 900, color: C.gold, lineHeight: 1.1, marginBottom: 18 }}>
            Your loyalty program.
          </p>
          <p style={{ fontFamily: fontBody, fontSize: 20, color: C.textMuted, lineHeight: 1.5 }}>
            Set your name, emoji, stamp goal, and reward. Live in minutes.
          </p>
        </div>

        {/* Settings summary */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 28,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '22px 44px',
          }}
        >
          <BrandCard label="Business Name" value="Cresta Bakery" delay={20} />
          <BrandCard label="Category" value="Café · Bakery" delay={28} />
          <BrandCard label="Stamps Required" value="6 visits" delay={36} />
          <BrandCard label="Reward" value="1 Free Coffee" delay={44} />
          <BrandCard label="Google Review" value="✓ Bonus stamp active" delay={52} />
          <BrandCard label="Smart Mode" value="⚡ Customers self-stamp" delay={60} />
        </div>
      </div>
    </div>
  )
}
