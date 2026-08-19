import React from 'react'
import { C } from './colors'

interface PhoneFrameProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function PhoneFrame({ children, style }: PhoneFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: 390,
        height: 844,
        borderRadius: 50,
        background: '#1a1a1a',
        boxShadow: '0 50px 150px rgba(0,0,0,0.7), inset 0 0 0 2px #333',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 126,
          height: 37,
          background: '#111',
          borderRadius: 20,
          zIndex: 10,
        }}
      />

      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          inset: 6,
          borderRadius: 44,
          background: C.bg,
          overflow: 'hidden',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 28px 8px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Arial, sans-serif' }}>9:41</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <SignalIcon />
            <WifiIcon />
            <BatteryIcon />
          </div>
        </div>

        {/* Page content */}
        <div style={{ height: 'calc(100% - 60px)', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <rect x="0" y="8" width="3" height="4" rx="1" fill="white"/>
      <rect x="5" y="5" width="3" height="7" rx="1" fill="white"/>
      <rect x="10" y="2" width="3" height="10" rx="1" fill="white"/>
      <rect x="15" y="0" width="3" height="12" rx="1" fill="white"/>
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <path d="M8 9.5C8.83 9.5 9.5 10.17 9.5 11S8.83 12.5 8 12.5 6.5 11.83 6.5 11 7.17 9.5 8 9.5Z" fill="white"/>
      <path d="M4.5 7.5C5.5 6.5 6.7 5.9 8 5.9s2.5.6 3.5 1.6" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <path d="M2 5C3.6 3.4 5.7 2.4 8 2.4s4.4 1 6 2.6" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
      <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="white" strokeOpacity="0.35"/>
      <rect x="2" y="2" width="17" height="9" rx="2" fill="white"/>
      <path d="M23 4.5V8.5C23.8 8.2 24.5 7.5 24.5 6.5S23.8 4.8 23 4.5Z" fill="white" fillOpacity="0.4"/>
    </svg>
  )
}
