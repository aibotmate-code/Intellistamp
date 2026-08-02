'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'

interface KioskModeProps {
  bizId: string
  businessName: string
  businessEmoji: string
  onExit: () => void
}

export default function KioskMode({ bizId, businessName, businessEmoji, onExit }: KioskModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [token, setToken] = useState('')
  const [seconds, setSeconds] = useState(30)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

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
        const res = await fetch(`/api/business/qr-token?bizId=${bizId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.token && mounted) {
          setToken(data.token)
          setSeconds(30)
          if (canvasRef.current) {
            const url = `${window.location.origin}/scan/${bizId}?t=${data.token}`
            QRCode.toCanvas(canvasRef.current, url, {
              width: 240,
              color: { dark: '#000000', light: '#ffffff' },
              margin: 2,
            }).catch(() => {})
          }
        }
      } catch (err) {
        console.error('Failed to fetch QR token', err)
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
        <div className="bg-white rounded-2xl p-4 shadow-2xl">
          <canvas ref={canvasRef} width={240} height={240} />
        </div>

        <p className="text-xs font-mono text-zinc-500 break-all w-full max-w-sm text-center bg-zinc-900/50 p-2 rounded">
          {token ? `${token.substring(0, 16)}...${token.slice(-16)}` : ''}
        </p>
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
      </div>
    </div>
  )
}
