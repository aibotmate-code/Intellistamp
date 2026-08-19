import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrowserFrame } from '../../components/BrowserFrame'
import { Cursor } from '../../components/Cursor'
import { C } from '../../components/colors'
import { fontBody, fontDisplay } from '../../components/fonts'
import { QRPattern } from '../../components/QRPattern'

const BUSINESS_NAME = 'Cresta Bakery'
const BUSINESS_EMOJI = '🥐'

function StatsCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 12,
        padding: '20px 22px',
        border: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flex: 1,
      }}
    >
      <span style={{ fontSize: 36 }}>{icon}</span>
      <div>
        <p style={{ fontFamily: fontBody, fontSize: 36, fontWeight: 900, color: C.text, margin: 0, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted, margin: '4px 0 0' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

function Tab({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      style={{
        padding: '12px 18px',
        fontFamily: fontBody,
        fontSize: 14,
        fontWeight: 500,
        color: active ? C.gold : C.textMuted,
        borderBottom: active ? `2px solid ${C.gold}` : '2px solid transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  )
}

export function DashboardSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 16, stiffness: 90 }, from: 60, to: 0 })
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  // Zoom into stats after 2.5s (75 frames) — shows stats clearly then zooms back out
  const ZOOM_START = 75
  const ZOOM_PEAK  = 105
  const ZOOM_END   = 160

  const statsZoom = interpolate(
    frame,
    [ZOOM_START, ZOOM_PEAK, ZOOM_END],
    [1, 1.22, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t },
  )
  const statsOrigin = 'top center'

  // Cursor path: appear on stats area at ZOOM_START, move to QR tab at frame 120
  const cursorX = interpolate(frame, [ZOOM_START, ZOOM_START + 40], [780, 290], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  })
  const cursorY = interpolate(frame, [ZOOM_START, ZOOM_START + 40], [310, 460], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  })
  const cursorOpacity = interpolate(frame, [ZOOM_START, ZOOM_START + 6], [0, 1], { extrapolateRight: 'clamp' })

  // Click on QR tab at frame 120
  const clickFrame = 120

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        position: 'relative',
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${slideIn}px)`,
          width: '100%',
          maxWidth: 1340,
          position: 'relative',
        }}
      >
        <BrowserFrame style={{ height: 860 }}>
          {/* Dashboard topbar */}
          <div
            style={{
              borderBottom: `1px solid ${C.elevated}`,
              background: C.bg,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏷️</span>
              <span style={{ fontFamily: fontBody, fontWeight: 900, fontSize: 18, color: C.text }}>
                IntelliStamp
              </span>
              <span
                style={{
                  fontFamily: fontBody,
                  fontSize: 11,
                  background: C.elevated,
                  color: C.textMuted,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                Business
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['⛶ Kiosk Mode', 'Settings', 'Logout'].map((label) => (
                <button
                  key={label}
                  style={{
                    fontFamily: fontBody,
                    fontSize: 13,
                    color: C.textMuted,
                    background: 'none',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '6px 14px',
                    cursor: 'default',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Page body */}
          <div style={{ padding: '24px 28px' }}>
            {/* Business header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <span style={{ fontSize: 38 }}>{BUSINESS_EMOJI}</span>
              <div>
                <h1 style={{ fontFamily: fontBody, fontSize: 24, fontWeight: 900, color: C.text, margin: 0 }}>
                  {BUSINESS_NAME}
                </h1>
                <p style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted, margin: '2px 0 0' }}>
                  Café · Bakery
                </p>
              </div>
            </div>

            {/* Stats with zoom */}
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 26,
                transform: `scale(${statsZoom})`,
                transformOrigin: statsOrigin,
              }}
            >
              <StatsCard icon="👥" label="Total Customers" value={14} />
              <StatsCard icon="🔖" label="Stamps Issued" value={47} />
              <StatsCard icon="🎁" label="Rewards Redeemed" value={3} />
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 0,
                borderBottom: `1px solid ${C.elevated}`,
                marginBottom: 24,
              }}
            >
              <Tab label="QR Stamper" active />
              <Tab label="Customers (14)" active={false} />
              <Tab label="Rewards" active={false} />
              <Tab label="Campaigns" active={false} />
              <Tab label="Settings" active={false} />
            </div>

            {/* QR Tab Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Left: QR display */}
              <div
                style={{
                  background: C.surface,
                  borderRadius: 16,
                  padding: 28,
                  border: `1px solid ${C.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                <p style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                  Customer scans this
                </p>
                <QRPattern size={200} />
                <div
                  style={{
                    fontFamily: fontDisplay,
                    fontSize: 44,
                    letterSpacing: '0.25em',
                    color: C.gold,
                    textAlign: 'center',
                  }}
                >
                  X7K3P2
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ fontFamily: fontBody, fontSize: 13, color: C.textMuted }}>
                    Refreshes in 42s
                  </span>
                </div>
                <button
                  style={{
                    fontFamily: fontBody,
                    fontSize: 14,
                    color: C.textMuted,
                    background: 'none',
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: '10px 20px',
                    width: '100%',
                    cursor: 'default',
                  }}
                >
                  ⛶ Enter Kiosk Mode
                </button>
              </div>

              {/* Right: Smart mode */}
              <div
                style={{
                  background: C.surface,
                  borderRadius: 16,
                  padding: 28,
                  border: `1px solid ${C.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 52 }}>⚡</span>
                <h3 style={{ fontFamily: fontBody, fontWeight: 700, fontSize: 22, color: C.text, margin: 0 }}>
                  Smart Mode Active
                </h3>
                <p style={{ fontFamily: fontBody, fontSize: 15, color: C.textMuted, margin: 0 }}>
                  Customers stamp themselves by scanning the QR
                </p>
                <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim, margin: 0 }}>
                  Enable Staff PIN in Settings for manual validation
                </p>
              </div>
            </div>
          </div>
        </BrowserFrame>

        {/* Animated cursor overlay */}
        {frame >= ZOOM_START && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: cursorOpacity }}>
            <Cursor x={cursorX} y={cursorY} clickAt={clickFrame} />
          </div>
        )}
      </div>
    </div>
  )
}
