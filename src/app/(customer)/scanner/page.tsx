'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, LockKey, Warning, ArrowLeft } from '@phosphor-icons/react'

type ScanState = 'checking' | 'scanning' | 'unsupported' | 'no_permission' | 'error'

declare class BarcodeDetector {
  constructor(opts: { formats: string[] })
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
  static getSupportedFormats(): Promise<string[]>
}

export default function ScannerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanState, setScanState] = useState<ScanState>('checking')
  const [hint, setHint] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      queueMicrotask(() => setScanState('unsupported'))
      return
    }

    let stopped = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()

        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        setScanState('scanning')

        const tick = async () => {
          if (stopped) return
          if (video.readyState >= 2) {
            try {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0) {
                const raw = barcodes[0].rawValue
                let path: string | null = null
                try {
                  const u = new URL(raw)
                  if (u.pathname.startsWith('/scan/')) path = u.pathname + u.search
                } catch {
                  if (raw.startsWith('/scan/')) path = raw
                }
                if (path) {
                  stopped = true
                  stream.getTracks().forEach((t) => t.stop())
                  router.push(path)
                  return
                } else {
                  setHint('Not an IntelliStamp QR — keep scanning')
                  setTimeout(() => setHint(''), 2000)
                }
              }
            } catch {
              // continue
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setScanState('no_permission')
        } else {
          setScanState('error')
        }
      }
    }

    start()

    return () => {
      stopped = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Scan Merchant QR</h1>
          <p className="text-xs text-zinc-400 mt-1">Point your camera at the counter display QR code</p>
        </div>

        {scanState === 'scanning' && (
          <div className="relative">
            <div className="rounded-lg overflow-hidden bg-black aspect-square w-full border border-zinc-800 shadow-md">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            </div>
            {/* Corner guides */}
            <div className="absolute inset-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-500 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-500 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-500 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-500 rounded-br-sm" />
            </div>
            {hint && (
              <div className="absolute bottom-4 inset-x-4 text-center bg-black/80 rounded-md py-1.5 px-3 border border-zinc-800">
                <p className="text-xs text-rose-400">{hint}</p>
              </div>
            )}
          </div>
        )}

        {scanState === 'checking' && (
          <div className="aspect-square w-full rounded-lg bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
            <div className="text-zinc-500 text-sm animate-pulse">Initializing camera...</div>
          </div>
        )}

        {scanState === 'unsupported' && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 text-center space-y-3 shadow-xs">
            <Camera size={32} weight="duotone" className="text-zinc-400 mx-auto" />
            <p className="font-semibold text-sm text-zinc-100">In-app camera not supported</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your browser doesn&apos;t support the camera scanner. Use your phone&apos;s
              <strong className="text-zinc-200"> Camera app</strong> to scan the QR code
              at the counter directly.
            </p>
          </div>
        )}

        {scanState === 'no_permission' && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 text-center space-y-3 shadow-xs">
            <LockKey size={32} weight="duotone" className="text-amber-500 mx-auto" />
            <p className="font-semibold text-sm text-zinc-100">Camera access required</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Allow camera permission in your browser, or open your default Camera app to scan the counter display.
            </p>
          </div>
        )}

        {scanState === 'error' && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 text-center space-y-3 shadow-xs">
            <Warning size={32} weight="duotone" className="text-rose-400 mx-auto" />
            <p className="font-semibold text-sm text-zinc-100">Camera error</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Could not access the camera. Try using your phone&apos;s standard Camera app.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/cards" className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1">
            <ArrowLeft size={12} />
            <span>Back to my cards</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
