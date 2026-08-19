import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { PhoneFrame } from '../components/PhoneFrame'
import { C } from '../components/colors'
import { fontBody, fontDisplay } from '../components/fonts'

// Google Review bonus stamp — this feature is real in the codebase
// (gmb_link field + bonus stamp prompt in kiosk mode).

function MilestoneRow({
  badge,
  reward,
  visitNumber,
  totalVisits,
  earned,
  animateIn,
}: {
  badge: string
  reward: string
  visitNumber: number
  totalVisits: number
  earned: boolean
  animateIn: number
}) {
  const frame = useCurrentFrame()

  const pct = Math.min(100, (totalVisits / visitNumber) * 100)
  const animPct = interpolate(frame, [animateIn, animateIn + 40], [0, pct], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2),
  })

  const rowOpacity = interpolate(frame, [animateIn - 8, animateIn + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const rowY = interpolate(frame, [animateIn - 8, animateIn + 6], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const visitsAway = Math.max(0, visitNumber - totalVisits)

  return (
    <div style={{ opacity: rowOpacity, transform: `translateY(${rowY}px)` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          borderRadius: 10,
          background: earned ? `${C.goldBg}` : 'transparent',
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>{earned ? '🏆' : '🔒'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: fontDisplay,
              fontSize: 14,
              color: earned ? C.gold : C.textMuted,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {badge}
          </p>
          <p
            style={{
              fontFamily: fontBody,
              fontSize: 12,
              color: earned ? C.textMuted : C.textDim,
              margin: '2px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {reward}
          </p>
        </div>
        {earned ? (
          <span
            style={{
              fontFamily: fontBody,
              fontSize: 11,
              fontWeight: 600,
              color: C.gold,
              background: C.goldBg,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 999,
              padding: '3px 10px',
              flexShrink: 0,
            }}
          >
            Earned ✓
          </span>
        ) : (
          <span style={{ fontFamily: fontBody, fontSize: 12, color: C.textDim, flexShrink: 0 }}>
            {visitsAway}v away
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!earned && (
        <div style={{ padding: '4px 12px 0' }}>
          <div
            style={{
              height: 3,
              background: C.border,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${animPct}%`,
                background: C.purple,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function CardScreenWithMilestones() {
  const frame = useCurrentFrame()

  const TOTAL_VISITS = 3

  return (
    <div
      style={{
        padding: '0 18px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingBottom: 20,
        overflowY: 'hidden',
      }}
    >
      {/* Business header */}
      <div style={{ textAlign: 'center', marginBottom: 14, marginTop: 8 }}>
        <span style={{ fontSize: 32 }}>🥐</span>
        <h1 style={{ fontFamily: fontBody, fontSize: 16, fontWeight: 900, color: C.text, margin: '4px 0 0' }}>
          Cresta Bakery
        </h1>
      </div>

      {/* Stamp card compact */}
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: '16px 18px',
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🥐</span>
          <div>
            <h3 style={{ fontFamily: fontBody, fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>
              Cresta Bakery
            </h3>
            <p style={{ fontFamily: fontBody, fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>
              Collect 6 stamps → Free Coffee
            </p>
          </div>
        </div>

        {/* Dots (compact) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: i < 3 ? C.gold : C.elevated,
                border: i < 3 ? 'none' : `2px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i < 3 ? '#000' : C.textDim,
                fontWeight: 700,
                fontSize: 16,
                boxShadow: i < 3 ? `0 2px 8px ${C.gold}55` : 'none',
              }}
            >
              {i < 3 ? '✓' : ''}
            </div>
          ))}
        </div>

        <span style={{ fontFamily: fontBody, fontSize: 12, color: C.textMuted }}>
          3/6 stamps · 3 total visits
        </span>

        {/* Divider */}
        <div style={{ height: 1, background: C.border }} />

        {/* Milestones label */}
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.textMuted,
            margin: 0,
          }}
        >
          Milestones
        </p>

        <MilestoneRow
          badge="Regular"
          reward="Free treat on your 5th visit"
          visitNumber={5}
          totalVisits={TOTAL_VISITS}
          earned={false}
          animateIn={20}
        />

        <MilestoneRow
          badge="Loyal Member"
          reward="Free dessert on your 10th visit"
          visitNumber={10}
          totalVisits={TOTAL_VISITS}
          earned={false}
          animateIn={32}
        />

        {/* Google Review bonus */}
        <div
          style={{
            opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [60, 75], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            marginTop: 4,
            border: `1px solid ${C.goldBorder}`,
            borderRadius: 10,
            padding: '10px 12px',
            background: C.goldBg,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>⭐</span>
          <div>
            <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: C.gold, margin: 0 }}>
              Bonus stamp for a Google Review
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 11, color: C.textMuted, margin: '3px 0 0' }}>
              Leave us a review and get an extra stamp instantly
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RewardScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, from: 300, to: 0 })
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Left caption */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 400,
          opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 46,
            fontWeight: 900,
            color: C.text,
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          Earn milestones. Unlock rewards.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 20, color: C.textMuted, lineHeight: 1.5 }}>
          Milestone rewards recognise loyal customers at every stage — automatically.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 18, color: C.gold, marginTop: 16, lineHeight: 1.5 }}>
          Even a Google review earns a bonus stamp.
        </p>
      </div>

      {/* Phone */}
      <div
        style={{
          position: 'absolute',
          right: 140,
          top: '50%',
          transform: `translateY(-50%) translateX(${slideIn}px)`,
          opacity,
        }}
      >
        <PhoneFrame>
          <CardScreenWithMilestones />
        </PhoneFrame>
      </div>
    </div>
  )
}
