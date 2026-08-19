import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { PhoneFrame } from '../../components/PhoneFrame'
import { C } from '../../components/colors'
import { fontBody, fontDisplay } from '../../components/fonts'

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
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 2),
  })
  const rowOpacity = interpolate(frame, [animateIn - 8, animateIn + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const rowY = interpolate(frame, [animateIn - 8, animateIn + 6], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
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
          background: earned ? C.goldBg : 'transparent',
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{earned ? '🏆' : '🔒'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: fontDisplay, fontSize: 15, color: earned ? C.gold : C.textMuted, margin: 0 }}>
            {badge}
          </p>
          <p style={{ fontFamily: fontBody, fontSize: 12, color: earned ? C.textMuted : C.textDim, margin: '2px 0 0' }}>
            {reward}
          </p>
        </div>
        {earned ? (
          <span
            style={{
              fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: C.gold,
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
              borderRadius: 999, padding: '3px 10px', flexShrink: 0,
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
      {!earned && (
        <div style={{ padding: '4px 12px 0' }}>
          <div style={{ height: 4, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${animPct}%`, background: C.purple, borderRadius: 999 }} />
          </div>
        </div>
      )}
    </div>
  )
}

function CardScreenWithMilestones() {
  const frame = useCurrentFrame()

  // Zoom into milestones section
  const ZOOM_START = 40
  const ZOOM_PEAK  = 80
  const ZOOM_END   = 150
  const milestonesZoom = interpolate(
    frame,
    [ZOOM_START, ZOOM_PEAK, ZOOM_END],
    [1, 1.18, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

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
        <span style={{ fontSize: 34 }}>🥐</span>
        <h1 style={{ fontFamily: fontBody, fontSize: 18, fontWeight: 900, color: C.text, margin: '4px 0 0' }}>
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
          <span style={{ fontSize: 24 }}>🥐</span>
          <div>
            <h3 style={{ fontFamily: fontBody, fontWeight: 700, fontSize: 16, color: C.text, margin: 0 }}>
              Cresta Bakery
            </h3>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>
              Collect 6 stamps → Free Coffee
            </p>
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: i < 3 ? C.gold : C.elevated,
                border: i < 3 ? 'none' : `2px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i < 3 ? '#000' : C.textDim,
                fontWeight: 700, fontSize: 16,
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

        <div style={{ height: 1, background: C.border }} />

        {/* Milestones section with zoom */}
        <div
          style={{
            transform: `scale(${milestonesZoom})`,
            transformOrigin: 'top center',
          }}
        >
          <p
            style={{
              fontFamily: fontBody, fontSize: 12, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: C.textMuted, margin: '0 0 8px',
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
              opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame, [55, 70], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
              marginTop: 6,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 10,
              padding: '10px 12px',
              background: C.goldBg,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>⭐</span>
            <div>
              <p style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: C.gold, margin: 0 }}>
                Bonus stamp for a Google Review
              </p>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: C.textMuted, margin: '3px 0 0' }}>
                Leave us a review and get an extra stamp instantly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RewardSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, from: 300, to: 0 })
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  const phoneScale = 1.12

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
          left: 100,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 420,
          opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <p style={{ fontFamily: fontBody, fontSize: 54, fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 14 }}>
          Earn milestones. Unlock rewards.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 22, color: C.textMuted, lineHeight: 1.5 }}>
          Milestone rewards recognise loyal customers at every stage — automatically.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 20, color: C.gold, marginTop: 16, lineHeight: 1.5 }}>
          Even a Google review earns a bonus stamp.
        </p>
      </div>

      {/* Phone */}
      <div
        style={{
          position: 'absolute',
          right: 110,
          top: '50%',
          transform: `translateY(-50%) translateX(${slideIn}px) scale(${phoneScale})`,
          transformOrigin: 'center center',
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
