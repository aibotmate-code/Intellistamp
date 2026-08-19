import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrowserFrame } from '../components/BrowserFrame'
import { C } from '../components/colors'
import { fontBody } from '../components/fonts'

const DEMO_CUSTOMERS = [
  { name: 'Rahul',  phone: '7210', stamps: 3, card: 3, completed: 0, lastVisit: '2h ago',   colorIdx: 0, canStamp: true },
  { name: 'Priya',  phone: '8834', stamps: 12, card: 0, completed: 2, lastVisit: '1d ago',  colorIdx: 1, canStamp: true },
  { name: 'Amit',   phone: '9921', stamps: 5, card: 5, completed: 0, lastVisit: '5h ago',   colorIdx: 2, canStamp: false },
  { name: 'Sneha',  phone: '6677', stamps: 18, card: 0, completed: 3, lastVisit: '3d ago',  colorIdx: 3, canStamp: true },
  { name: 'Vikram', phone: '0045', stamps: 8,  card: 2, completed: 1, lastVisit: '12h ago', colorIdx: 4, canStamp: false },
  { name: 'Anjali', phone: '1193', stamps: 1,  card: 1, completed: 0, lastVisit: '30m ago', colorIdx: 5, canStamp: true },
]

const COLORS = ['#3b82f6','#22c55e','#a855f7','#ec4899','#f97316','#14b8a6']

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

function CustomerRow({ c, stampsRequired, delay }: { c: typeof DEMO_CUSTOMERS[0]; stampsRequired: number; delay: number }) {
  const frame = useCurrentFrame()
  const rowOpacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const rowY = interpolate(frame, [delay, delay + 12], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const initials = c.name.slice(0, 2).toUpperCase()
  const colorClass = COLORS[c.colorIdx % COLORS.length]

  return (
    <tr
      style={{
        borderBottom: `1px solid ${C.elevated}`,
        opacity: rowOpacity,
        transform: `translateY(${rowY}px)`,
        display: 'table-row',
      }}
    >
      {/* Customer */}
      <td style={{ padding: '14px 0', paddingRight: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: colorClass,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: fontBody,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ fontFamily: fontBody, fontWeight: 500, fontSize: 14, color: C.text, margin: 0 }}>
              {c.name}
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: C.textDim, margin: '2px 0 0' }}>
              ••••{c.phone}
            </p>
          </div>
        </div>
      </td>

      {/* Progress dots */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: Math.min(stampsRequired, 6) }).map((_, j) => (
            <div
              key={j}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: j < c.card ? C.gold : C.elevated,
              }}
            />
          ))}
        </div>
      </td>

      {/* Stamps */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: fontBody, fontWeight: 700, color: C.gold, fontSize: 14 }}>
            {c.stamps}
          </span>
          {c.completed > 0 && (
            <span style={{ fontFamily: fontBody, fontSize: 12, color: '#4ade80' }}>
              ({c.completed}🎁)
            </span>
          )}
        </div>
      </td>

      {/* Last visit */}
      <td style={{ padding: '14px 12px' }}>
        <span style={{ fontFamily: fontBody, fontSize: 13, color: C.textMuted }}>{c.lastVisit}</span>
      </td>

      {/* Status */}
      <td style={{ padding: '14px 0' }}>
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 999,
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

export function MerchantScene() {
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
        padding: 60,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${slideIn}px)`,
          width: '100%',
          maxWidth: 1200,
        }}
      >
        <BrowserFrame style={{ height: 820 }}>
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
                }}
              >
                Business
              </span>
            </div>
          </div>

          {/* Page body */}
          <div style={{ padding: '22px 28px' }}>
            {/* Business header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span style={{ fontSize: 34 }}>🥐</span>
              <div>
                <h1 style={{ fontFamily: fontBody, fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>
                  Cresta Bakery
                </h1>
                <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textMuted, margin: '2px 0 0' }}>
                  Café · Bakery
                </p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
              {[
                { icon: '👥', label: 'Total Customers', value: 14 },
                { icon: '🔖', label: 'Stamps Issued', value: 47 },
                { icon: '🎁', label: 'Rewards Redeemed', value: 3 },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  style={{
                    background: C.surface,
                    borderRadius: 12,
                    padding: '16px 18px',
                    border: `1px solid ${C.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{icon}</span>
                  <div>
                    <p style={{ fontFamily: fontBody, fontSize: 24, fontWeight: 900, color: C.text, margin: 0, lineHeight: 1 }}>
                      {value}
                    </p>
                    <p style={{ fontFamily: fontBody, fontSize: 12, color: C.textMuted, margin: '3px 0 0' }}>
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: `1px solid ${C.elevated}`,
                marginBottom: 22,
              }}
            >
              <Tab label="QR Stamper" active={false} />
              <Tab label="Customers (14)" active />
              <Tab label="Rewards" active={false} />
              <Tab label="Campaigns" active={false} />
              <Tab label="Settings" active={false} />
            </div>

            {/* Customer table */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textMuted, margin: 0 }}>
                6 of 14 customers shown
              </p>
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
                ⬇ Export Customers
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Customer', 'Progress', 'Stamps', 'Last Visit', 'Status'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontFamily: fontBody,
                        fontSize: 12,
                        color: C.textDim,
                        fontWeight: 500,
                        paddingBottom: 10,
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
                  <CustomerRow key={c.name} c={c} stampsRequired={STAMPS_REQUIRED} delay={i * 10 + 20} />
                ))}
              </tbody>
            </table>
          </div>
        </BrowserFrame>
      </div>
    </div>
  )
}
