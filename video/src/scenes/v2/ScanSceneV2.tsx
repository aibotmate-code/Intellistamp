import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { PhoneFrame } from '../../components/PhoneFrame'
import { C } from '../../components/colors'
import { fontBody } from '../../components/fonts'

const BUSINESS_EMOJI = '🥐'
const BUSINESS_NAME = 'Cresta Bakery'

function InputField({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 500, color: C.textMuted }}>{label}</label>
      <div
        style={{
          background: C.elevated,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '16px 18px',
          fontFamily: fontBody,
          fontSize: 17,
          color: value ? C.text : C.textDim,
        }}
      >
        {value || placeholder || ''}
      </div>
    </div>
  )
}

function ActionButton({ label }: { label: string }) {
  return (
    <div
      style={{
        background: C.gold,
        borderRadius: 12,
        padding: '18px 22px',
        textAlign: 'center',
        fontFamily: fontBody,
        fontSize: 17,
        fontWeight: 700,
        color: '#000',
        cursor: 'default',
      }}
    >
      {label}
    </div>
  )
}

function TapIndicator({ visible }: { visible: boolean }) {
  const frame = useCurrentFrame()
  const pulse = spring({ frame: frame % 30, fps: 30, config: { damping: 12, stiffness: 180 }, from: 0.85, to: 1.08 })

  if (!visible) return null
  return (
    <div
      style={{
        position: 'absolute',
        right: 18,
        top: '55%',
        transform: `translateY(-50%) scale(${pulse})`,
        fontSize: 36,
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
      }}
    >
      👆
    </div>
  )
}

function PhoneScreen({ showName }: { showName: boolean }) {
  const frame = useCurrentFrame()

  return (
    <div
      style={{
        padding: '0 22px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingBottom: 24,
        position: 'relative',
      }}
    >
      {/* Business header */}
      <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 10 }}>
        <div style={{ fontSize: 48 }}>{BUSINESS_EMOJI}</div>
        <h1 style={{ fontFamily: fontBody, fontSize: 22, fontWeight: 900, color: C.text, margin: '8px 0 0' }}>
          {BUSINESS_NAME}
        </h1>
      </div>

      {/* Card */}
      <div
        style={{
          background: C.surface,
          borderRadius: 20,
          padding: 26,
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {!showName ? (
          <>
            <h2 style={{ fontFamily: fontBody, fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
              Enter your phone to collect a stamp
            </h2>
            <InputField label="Phone Number" value="9876543210" />
            <ActionButton label="Continue →" />
            <TapIndicator visible={frame < 80} />
            <p style={{ fontFamily: fontBody, fontSize: 14, color: C.textDim, textAlign: 'center', margin: 0 }}>
              Already enrolled? Recover my card
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: fontBody, fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
              Welcome! What&apos;s your name?
            </h2>
            <p style={{ fontFamily: fontBody, fontSize: 15, color: C.textMuted, margin: 0 }}>
              First time here — just your name and you&apos;re in.
            </p>
            <InputField label="Your Name" value="Rahul" />
            <ActionButton label="Join & Get Stamp →" />
            <TapIndicator visible />
            <p style={{ fontFamily: fontBody, fontSize: 14, color: C.textDim, textAlign: 'center', margin: 0 }}>
              ← Change number
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export function ScanSceneV2() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, from: 300, to: 0 })
  const opacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' })

  // Show name input after ~3s (90 frames in a 6s scene)
  const showName = frame >= 90

  // Zoom slightly into the phone content
  const ZOOM_START = 30
  const phoneZoom = interpolate(frame, [ZOOM_START, ZOOM_START + 40], [1, 1.1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const captionOpacity = interpolate(frame, [105, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
        gap: 40,
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
        <p
          style={{
            fontFamily: fontBody,
            fontSize: 54,
            fontWeight: 900,
            color: C.text,
            lineHeight: 1.15,
            marginBottom: 14,
          }}
        >
          No app download needed.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 22, color: C.textMuted, lineHeight: 1.5 }}>
          Scan, enter your phone number, and instantly join — first or fiftieth visit.
        </p>
      </div>

      {/* Phone — larger (460px wide via scale) */}
      <div
        style={{
          position: 'absolute',
          right: 130,
          top: '50%',
          transform: `translateY(-50%) translateX(${slideIn}px) scale(${phoneZoom})`,
          transformOrigin: 'center center',
          opacity,
        }}
      >
        <PhoneFrame>
          <PhoneScreen showName={showName} />
        </PhoneFrame>
      </div>

      {/* Transition caption */}
      {showName && (
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: captionOpacity,
            fontFamily: fontBody,
            fontSize: 22,
            color: C.textMuted,
            textAlign: 'center',
          }}
        >
          First visit? Just add a name. Done.
        </div>
      )}
    </div>
  )
}
