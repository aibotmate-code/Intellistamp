import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrowserFrame } from '../../components/BrowserFrame'
import { C } from '../../components/colors'
import { fontBody } from '../../components/fonts'

// Only 4 customers shown — spotlight on Rahul + 3 others
const DEMO_CUSTOMERS = [
  { name: 'Rahul',  phone: '7210', stamps: 3, card: 3, completed: 0, lastVisit: '2h ago',   colorIdx: 0, canStamp: true,  spotlight: true  },
  { name: 'Priya',  phone: '8834', stamps: 12, card: 0, completed: 2, lastVisit: '1d ago',  colorIdx: 1, canStamp: true,  spotlight: false },
  { name: 'Amit',   phone: '9921', stamps: 5, card: 5, completed: 0, lastVisit: '5h ago',   colorIdx: 2, canStamp: false, spotlight: false },
  { name: 'Sneha',  phone: '6677', stamps: 18, card: 0, completed: 3, lastVisit: '3d ago',  colorIdx: 3, canStamp: true,  spotlight: false },
]

const COLORS = ['#3b82f6','#22c55e','#a855f7','#ec4899']

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

function CustomerRow({
  c, stampsRequired, delay, zoomIn,
}: {
  c: typeof DEMO_CUSTOMERS[0]
  stampsRequired: number
  delay: number
  zoomIn: boolean
}) {
  const frame = useCurrentFrame()
  const rowOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const rowY = interpolate(frame, [delay, delay + 12], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const initials = c.name.slice(0, 2).toUpperCase()
  const color = COLORS[c.colorIdx % COLORS.length]

  // Spotlight zoom on Rahul's row
  const ZOOM_START = 90
  const ZOOM_PEAK  = 120
  const ZOOM_END   = 140
  const rowScale = zoomIn
    ? interpolate(frame, [ZOOM_START, ZOOM_PEAK, ZOOM_END], [1, 1.06, 1.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const rowGlow = zoomIn && frame >= ZOOM_START
    ? interpolate(frame, [ZOOM_START, ZOOM_PEAK], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0

  return (
    <tr
      style={{
        borderBottom: `1px solid ${C.elevated}`,
        opacity: rowOpacity,
        transform: `translateY(${rowY}px) scale(${rowScale})`,
        transformOrigin: 'left center',
        display: 'table-row',
        background: rowGlow > 0.1 ? `rgba(234,179,8,${rowGlow * 0.07})` : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      {/* Customer */}
      <td style={{ padding: '16px 0', paddingRight: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: color,
              border: zoomIn && frame >= ZOOM_START ? `2px solid ${C.gold}` : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: fontBody, flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 16, color: C.text, margin: 0 }}>
              {c.name}
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim, margin: '2px 0 0' }}>
              ••••{c.phone}
            </p>
          </div>
        </div>
      </td>

      {/* Progress dots */}
      <td style={{ padding: '16px 12px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: Math.min(stampsRequired, 6) }).map((_, j) => (
            <div
              key={j}
              style={{
                width: 14, height: 14, borderRadius: '50%',
                background: j < c.card ? C.gold : C.elevated,
              }}
            />
          ))}
        </div>
      </td>

      {/* Stamps */}
      <td style={{ padding: '16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: fontBody, fontWeight: 700, color: C.gold, fontSize: 16 }}>
            {c.stamps}
          </span>
          {c.completed > 0 && (
            <span style={{ fontFamily: fontBody, fontSize: 13, color: '#4ade80' }}>
              ({c.completed}🎁)
            </span>
          )}
        </div>
      </td>

      {/* Last visit */}
      <td style={{ padding: '16px 12px' }}>
        <span style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted }}>{c.lastVisit}</span>
      </td>

      {/* Status */}
      <td style={{ padding: '16px 0' }}>
        <span
          style={{
            fontFamily: fontBody, fontSize: 12, fontWeight: 600,
            padding: '4px 12px', borderRadius: 999,
            background: c.canStamp ? '#14532d' : C.elevated,
            color: c.canStamp ? '#4ade80' : C.textMuted,
          }}
        >
          {c.canStamp ? 'Ready' : 'Cooling'}
        </span>
      </td>
    </tr>
  )
}

export function MerchantSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 16, stiffness: 90 }, from: 60, to: 0 })
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  const STAMPS_REQUIRED = 6

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
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${slideIn}px)`,
          width: '100%',
          maxWidth: 1340,
        }}
      >
        <BrowserFrame style={{ height: 720 }}>
          {/* Topbar */}
          <div
            style={{
              borderBottom: `1px solid ${C.elevated}`,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏷️</span>
              <span style={{ fontFamily: fontBody, fontWeight: 900, fontSize: 18, color: C.text }}>IntelliStamp</span>
              <span style={{ fontFamily: fontBody, fontSize: 11, background: C.elevated, color: C.textMuted, padding: '2px 8px', borderRadius: 6 }}>
                Business
              </span>
            </div>
          </div>

          {/* Page body */}
          <div style={{ padding: '22px 28px' }}>
            {/* Business header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span style={{ fontSize: 36 }}>🥐</span>
              <div>
                <h1 style={{ fontFamily: fontBody, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>
                  Cresta Bakery
                </h1>
                <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textMuted, margin: '2px 0 0' }}>
                  Café · Bakery
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.elevated}`, marginBottom: 22 }}>
              <Tab label="QR Stamper" active={false} />
              <Tab label="Customers (14)" active />
              <Tab label="Rewards" active={false} />
              <Tab label="Campaigns" active={false} />
              <Tab label="Settings" active={false} />
            </div>

            {/* Sub-header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted, margin: 0 }}>
                Showing recent active customers
              </p>
              <span
                style={{
                  fontFamily: fontBody, fontSize: 13, color: C.gold,
                  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                  borderRadius: 8, padding: '5px 14px',
                }}
              >
                ↑ 4 new this week
              </span>
            </div>

            {/* Customer table — 4 rows, easier to read */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Customer', 'Progress', 'Stamps', 'Last Visit', 'Status'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', fontFamily: fontBody, fontSize: 13,
                        color: C.textDim, fontWeight: 500, paddingBottom: 12,
                        borderBottom: `1px solid ${C.elevated}`,
                        paddingRight: h !== 'Status' ? 12 : 0,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_CUSTOMERS.map((c, i) => (
                  <CustomerRow
                    key={c.name}
                    c={c}
                    stampsRequired={STAMPS_REQUIRED}
                    delay={i * 12 + 20}
                    zoomIn={c.spotlight}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </BrowserFrame>
      </div>
    </div>
  )
}
