'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'

interface QRDisplayProps {
  bizId: string
  size?: number
  showToken?: boolean
  className?: string
}

export default function QRDisplay({ bizId, size = 200, showToken = true, className }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [token, setToken] = useState('')
  const [seconds, setSeconds] = useState(30)

  useEffect(() => {
    let mounted = true
    let refreshTimer: NodeJS.Timeout
    let countdownTimer: NodeJS.Timeout

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
              width: size,
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

    countdownTimer = setInterval(() => {
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
  }, [bizId, size])

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="bg-white rounded-xl p-3">
        <canvas ref={canvasRef} width={size} height={size} />
      </div>

      {showToken && (
        <>
          <div className="text-center">
            <p className="text-3xl font-black tracking-widest text-yellow-400 font-mono">
              {token}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(
              'w-2 h-2 rounded-full animate-pulse-dot',
              seconds > 10 ? 'bg-green-400' : 'bg-red-400'
            )} />
            <span className={seconds > 10 ? 'text-zinc-400' : 'text-red-400'}>
              Refreshes in {seconds}s
            </span>
          </div>
        </>
      )}
    </div>
  )
}
