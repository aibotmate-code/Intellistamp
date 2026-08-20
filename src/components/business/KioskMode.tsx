'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'
import { X } from '@phosphor-icons/react'
import Logo from '@/components/brand/Logo'

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
        const res = await fetch(`/api/business/qr-token?bizId=${bizId}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
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
      className="fixed inset-0 bg-zinc-950 z-[9999] flex flex-col items-center justify-between p-6 sm:p-8 text-zinc-100 is-dot-grid"
    >
      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center gap-1"
      >
        <X size={12} />
        <span>Exit Display</span>
      </button>

      {/* Top: business info */}
      <div className="text-center mt-6">
        <div className="text-4xl mb-2">{businessEmoji}</div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{businessName}</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Customer Counter Display</p>
      </div>

      {/* Center: QR */}
      <div className="flex flex-col items-center gap-4 my-auto">
        <div className="bg-white rounded-lg p-3.5 shadow-md flex items-center justify-center" style={{ width: 250, height: 250 }}>
          {token ? (
            <QRCodeSVG
              value={qrUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-400 text-xs">
              {diagnostic.status === 'loading' || diagnostic.status === 'fetching' ? (
                <span className="animate-pulse">Loading QR...</span>
              ) : (
                <span className="text-rose-500">Error loading QR</span>
              )}
            </div>
          )}
        </div>

        <div className="text-center w-full max-w-full px-2 overflow-hidden flex justify-center">
          <p className="text-[11px] font-mono text-zinc-500 bg-zinc-900/60 border border-zinc-800/80 px-2 py-1 rounded truncate max-w-[260px]" title={token}>
            {token ? `${token.substring(0, 12)}...${token.slice(-12)}` : '...'}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="text-center space-y-2 mb-4 flex flex-col items-center">
        <p className="text-xs font-medium text-zinc-200">Scan with your phone camera to collect your stamp</p>
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            seconds > 10 ? 'bg-emerald-400' : 'bg-rose-400'
          )} />
          <span className={seconds > 10 ? 'text-zinc-400' : 'text-rose-400'}>
            Refreshes in {seconds}s
          </span>
        </div>
        <div className="pt-2">
          <Logo size="sm" />
        </div>
      </div>
    </div>
  )
}
