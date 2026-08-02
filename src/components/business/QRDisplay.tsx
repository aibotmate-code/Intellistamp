'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface QRDisplayProps {
  bizId: string
  size?: number
  showToken?: boolean
  className?: string
}

export default function QRDisplay({ bizId, size = 200, showToken = true, className }: QRDisplayProps) {
  const [token, setToken] = useState('')
  const [seconds, setSeconds] = useState(30)
  const [diagnostic, setDiagnostic] = useState({ tokenPresent: false, tokenLength: 0, status: 'loading' })

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

  const qrUrl = token ? `${window.location.origin}/scan/${bizId}?t=${token}` : ''

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="bg-white rounded-xl p-3 flex items-center justify-center" style={{ width: size + 24, height: size + 24 }}>
        {token ? (
          <QRCodeSVG
            value={qrUrl}
            size={size}
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

      {showToken && (
        <>
          <div className="text-center w-full max-w-full px-2 overflow-hidden flex justify-center">
            <p className="text-xs font-mono text-zinc-500 bg-zinc-900/50 p-2 rounded truncate max-w-[200px]" title={token}>
              {token ? `${token.substring(0, 16)}...${token.slice(-16)}` : '...'}
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
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-[10px] font-mono text-zinc-500 text-left bg-black/20 p-2 rounded w-full max-w-xs">
              <div>status: {diagnostic.status}</div>
              <div>tokenPresent: {String(diagnostic.tokenPresent)}</div>
              <div>tokenLength: {diagnostic.tokenLength}</div>
              <div>canvasWidth: {size}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
