'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { generateToken, getSecondsUntilRotation } from '@/lib/token'
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
  const [seconds, setSeconds] = useState(getSecondsUntilRotation())

  useEffect(() => {
    const update = () => {
      const newToken = generateToken(bizId, 0)
      setToken(newToken)
      setSeconds(getSecondsUntilRotation())
      if (canvasRef.current) {
        const url = `${window.location.origin}/scan/${bizId}?t=${newToken}`
        QRCode.toCanvas(canvasRef.current, url, {
          width: size,
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
  }, [bizId, size, token])

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
