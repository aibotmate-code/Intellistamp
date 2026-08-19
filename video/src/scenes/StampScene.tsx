import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { PhoneFrame } from '../components/PhoneFrame'
import { StampDots } from '../components/StampDots'
import { C } from '../components/colors'
import { fontBody } from '../components/fonts'

const STAMPS_REQUIRED = 6
const PREV_STAMPS     = 2
const NEW_STAMP_INDEX = 2   // 0-based: the 3rd stamp

// Frame within the scene at which the new stamp "pops"
const STAMP_POP_FRAME = 50

function CardScreen() {
  const frame = useCurrentFrame()

  // Toast fades in at stamp pop
  const toastOpacity = interpolate(
    frame,
    [STAMP_POP_FRAME, STAMP_POP_FRAME + 8, STAMP_POP_FRAME + 60, STAMP_POP_FRAME + 80],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  const filledNow = frame >= STAMP_POP_FRAME ? PREV_STAMPS + 1 : PREV_STAMPS

  const footerOpacity = interpolate(
    frame,
    [STAMP_POP_FRAME + 10, STAMP_POP_FRAME + 25],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <div
      style={{
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingBottom: 20,
        position: 'relative',
      }}
    >
      {/* Toast */}
      {frame >= STAMP_POP_FRAME && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#22c55e',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 999,
            fontFamily: fontBody,
            fontWeight: 600,
            fontSize: 15,
            whiteSpace: 'nowrap',
            opacity: toastOpacity,
            zIndex: 10,
          }}
        >
          Stamp added! 🎉
        </div>
      )}

      {/* Business header */}
      <div style={{ textAlign: 'center', marginBottom: 20, marginTop: 8 }}>
        <span style={{ fontSize: 36 }}>🥐</span>
        <h1 style={{ fontFamily: fontBody, fontSize: 18, fontWeight: 900, color: C.text, margin: '4px 0 0' }}>
          Cresta Bakery
        </h1>
      </div>

      {/* Stamp card */}
      <div
        style={{
          background: C.surface,
          borderRadius: 20,
          padding: 22,
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🥐</span>
          <div>
            <h3 style={{ fontFamily: fontBody, fontWeight: 700, fontSize: 18, color: C.text, margin: 0, lineHeight: 1 }}>
              Cresta Bakery
            </h3>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: C.textMuted, margin: '3px 0 0' }}>
              Collect {STAMPS_REQUIRED} stamps → Free Coffee
            </p>
          </div>
        </div>

        {/* Stamp dots */}
        <StampDots
          total={STAMPS_REQUIRED}
          filled={filledNow}
          newIndex={frame >= STAMP_POP_FRAME ? NEW_STAMP_INDEX : undefined}
          animateAtFrame={STAMP_POP_FRAME}
        />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: footerOpacity,
          }}
        >
          <span style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted }}>
            {filledNow}/{STAMPS_REQUIRED} stamps
          </span>
          <span style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim }}>
            3 more for a Free Coffee
          </span>
        </div>
      </div>

      {/* View card button */}
      <div
        style={{
          marginTop: 12,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '14px',
          textAlign: 'center',
          fontFamily: fontBody,
          fontSize: 15,
          color: C.textMuted,
          opacity: footerOpacity,
        }}
      >
        View My Card
      </div>
    </div>
  )
}

export function StampScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, from: 300, to: 0 })
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })

  const captionOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })

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
          maxWidth: 420,
          opacity: captionOpacity,
        }}
      >
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 48,
            fontWeight: 900,
            color: C.text,
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          Digital loyalty that customers actually use.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 20, color: C.textMuted, lineHeight: 1.5 }}>
          Every stamp lives on their phone. No card to carry. No account to create.
        </p>
      </div>

      {/* Phone */}
      <div
        style={{
          position: 'absolute',
          right: 160,
          top: '50%',
          transform: `translateY(-50%) translateX(${slideIn}px)`,
          opacity,
        }}
      >
        <PhoneFrame>
          <CardScreen />
        </PhoneFrame>
      </div>
    </div>
  )
}
