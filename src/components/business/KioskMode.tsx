'use client'

import { useEffect, useRef, useState } from 'react'
import { generateToken, getSecondsUntilRotation } from '@/lib/token'
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
  const [seconds, setSeconds] = useState(getSecondsUntilRotation())
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
    const update = () => {
      const newToken = generateToken(bizId, 0)
      setToken(newToken)
      setSeconds(getSecondsUntilRotation())
      if (canvasRef.current) {
        const url = `${window.location.origin}/scan/${bizId}?t=${newToken}`
        QRCode.toCanvas(canvasRef.current, url, {
          width: 240,
          color: { dark: '#000000', light: '#ffffff' },
          margin: 2,
        }).catch(() => {})
      }
    }

    update()
    const interval = setInterval(() => {
      setSeconds(getSecondsUntilRotation())
      const currentToken = generateToken(bizId, 0)
      if (currentToken !== token) update()
    }, 1000)

    return () => clearInterval(interval)
  }, [bizId, token])

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

        <p className="text-5xl font-black tracking-[12px] text-yellow-400 font-mono">
          {token}
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
