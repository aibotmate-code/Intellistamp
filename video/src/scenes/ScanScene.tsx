import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { PhoneFrame } from '../components/PhoneFrame'
import { C } from '../components/colors'
import { fontBody } from '../components/fonts'

const BUSINESS_EMOJI = '🥐'
const BUSINESS_NAME = 'Cresta Bakery'

function InputField({
  label,
  value,
  placeholder,
}: {
  label: string
  value?: string
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 500, color: C.textMuted }}>
        {label}
      </label>
      <div
        style={{
          background: C.elevated,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '14px 16px',
          fontFamily: fontBody,
          fontSize: 16,
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
        padding: '16px 20px',
        textAlign: 'center',
        fontFamily: fontBody,
        fontSize: 16,
        fontWeight: 700,
        color: '#000',
        cursor: 'default',
      }}
    >
      {label}
    </div>
  )
}

function PhoneScreen({ showName }: { showName: boolean }) {
  return (
    <div
      style={{
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingBottom: 20,
      }}
    >
      {/* Business header */}
      <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
        <div style={{ fontSize: 44 }}>{BUSINESS_EMOJI}</div>
        <h1 style={{ fontFamily: fontBody, fontSize: 20, fontWeight: 900, color: C.text, margin: '6px 0 0' }}>
          {BUSINESS_NAME}
        </h1>
      </div>

      {/* Card */}
      <div
        style={{
          background: C.surface,
          borderRadius: 20,
          padding: 24,
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {!showName ? (
          <>
            <h2 style={{ fontFamily: fontBody, fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
              Enter your phone to collect a stamp
            </h2>
            <InputField label="Phone Number" value="9876543210" placeholder="9876543210" />
            <ActionButton label="Continue →" />
            <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim, textAlign: 'center', margin: 0 }}>
              Already enrolled? Recover my card
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: fontBody, fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
              Welcome! What&apos;s your name?
            </h2>
            <p style={{ fontFamily: fontBody, fontSize: 14, color: C.textMuted, margin: 0 }}>
              First time here — just your name and you&apos;re in.
            </p>
            <InputField label="Your Name" value="Rahul" placeholder="Rahul" />
            <ActionButton label="Join & Get Stamp →" />
            <p style={{ fontFamily: fontBody, fontSize: 13, color: C.textDim, textAlign: 'center', margin: 0 }}>
              ← Change number
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export function ScanScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Phone slides in from right
  const slideIn = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, from: 300, to: 0 })
  const opacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' })

  // Show name input after ~3.5s in the scene (105 frames)
  const showName = frame >= 105

  // Caption transition
  const captionOpacity = interpolate(frame, [130, 145], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
          left: 120,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 380,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
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
          No app download needed.
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 20, color: C.textMuted, lineHeight: 1.5 }}>
          Customers scan, enter their phone, and instantly join — first or hundredth visit.
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
          <PhoneScreen showName={showName} />
        </PhoneFrame>
      </div>

      {/* Transition caption */}
      {showName && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: captionOpacity,
            fontFamily: fontBody,
            fontSize: 20,
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
