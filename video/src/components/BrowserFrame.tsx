import React from 'react'
import { C } from './colors'

interface BrowserFrameProps {
  url?: string
  children: React.ReactNode
  style?: React.CSSProperties
}

export function BrowserFrame({ url = 'stamp.intellicallabs.com/dashboard', children, style }: BrowserFrameProps) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
        boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Chrome bar */}
      <div
        style={{
          background: C.elevated,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {/* Traffic lights */}
        {(['#ff5f57', '#febc2e', '#28c840'] as const).map((color, i) => (
          <div
            key={i}
            style={{ width: 13, height: 13, borderRadius: 9999, background: color }}
          />
        ))}
        {/* URL bar */}
        <div
          style={{
            flex: 1,
            margin: '0 12px',
            background: C.bg,
            borderRadius: 8,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Arial, sans-serif' }}>
            🔒 {url}
          </span>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', background: C.bg }}>
        {children}
      </div>
    </div>
  )
}
