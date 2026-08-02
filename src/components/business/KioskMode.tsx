'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface KioskModeProps {
  bizId: string
  businessName: string
  businessEmoji: string
  onExit: () => void
}

export default function KioskMode({ bizId, businessName, businessEmoji, onExit }: KioskModeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [token, setToken] = useState('')
  const [seconds, setSeconds] = useState(30)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [diagnostic, setDiagnostic] = useState({ tokenPresent: false, tokenLength: 0, status: 'loading' })

  useEffect(() => {
    // Request fullscreen
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {})
    }

    // Wake lock
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLockRef.current = lock
      }).catch(() => {})
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const fetchToken = async () => {
      try {
        setDiagnostic(d => ({ ...d, status: 'fetching' }))
        const res = await fetch(`/api/business/qr-token?bizId=${bizId}`)
        if (!res.ok) {
          if (mounted) setDiagnostic(d => ({ ...d, status: `error_${res.status}` }))
          return
        }
        const data = await res.json()
        if (mounted) {
          if (data.token) {
            setToken(data.token)
            setSeconds(30)
            setDiagnostic({ tokenPresent: true, tokenLength: data.token.length, status: 'success' })
          } else {
            setDiagnostic(d => ({ ...d, status: 'no_token_in_response' }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch QR token', err)
        if (mounted) setDiagnostic(d => ({ ...d, status: 'fetch_failed' }))
      }
    }

    fetchToken()

    const countdownTimer = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          fetchToken()
          return 30
        }
        return s - 1
      })
    }, 1000)

    return () => {
      mounted = false
      clearInterval(countdownTimer)
    }
  }, [bizId])

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    wakeLockRef.current?.release().catch(() => {})
    onExit()
  }

  const qrUrl = token ? `${window.location.origin}/scan/${bizId}?t=${token}` : ''

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-zinc-950 z-[9999] flex flex-col items-center justify-between p-8"
    >
      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-4 right-4 text-zinc-500 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500"
      >
        ✕ Exit
      </button>

      {/* Top: business info */}
      <div className="text-center mt-8">
        <div className="text-5xl mb-2">{businessEmoji}</div>
        <p className="text-2xl font-black text-zinc-400 tracking-widest uppercase">{businessName}</p>
      </div>

      {/* Center: QR */}
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-2xl flex items-center justify-center" style={{ width: 272, height: 272 }}>
          {token ? (
            <QRCodeSVG
              value={qrUrl}
              size={240}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-400 text-sm">
              {diagnostic.status === 'loading' || diagnostic.status === 'fetching' ? (
                <span className="animate-pulse">Loading QR...</span>
              ) : (
                <span className="text-red-500">Error: {diagnostic.status}</span>
              )}
            </div>
          )}
        </div>

        <div className="text-center w-full max-w-full px-2 overflow-hidden flex justify-center">
          <p className="text-xs font-mono text-zinc-500 bg-zinc-900/50 p-2 rounded truncate max-w-[300px]" title={token}>
            {token ? `${token.substring(0, 16)}...${token.slice(-16)}` : '...'}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="text-center space-y-2">
        <p className="text-zinc-300 font-medium">Scan with your phone to collect a stamp</p>
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className={cn(
            'w-2 h-2 rounded-full animate-pulse-dot',
            seconds > 10 ? 'bg-green-400' : 'bg-red-400'
          )} />
          <span className={seconds > 10 ? 'text-zinc-500' : 'text-red-400'}>
            Refreshes in {seconds}s
          </span>
        </div>
        <p className="text-zinc-600 text-xs mt-4">
          Powered by IntelliStamp · stamp.intellicallabs.com
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-[10px] font-mono text-zinc-500 text-center bg-black/20 p-2 rounded max-w-xs mx-auto flex gap-4 justify-center">
            <span>status: {diagnostic.status}</span>
            <span>tok: {diagnostic.tokenLength}</span>
          </div>
        )}
      </div>
    </div>
  )
}
