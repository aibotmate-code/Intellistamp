'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
                // Accept full URLs or bare paths
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white">Scan Business QR</h1>
          <p className="text-zinc-400 text-sm mt-1">Point your camera at the stamp QR code</p>
        </div>

        {scanState === 'scanning' && (
          <div className="relative">
            <div className="rounded-2xl overflow-hidden bg-black aspect-square w-full">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            </div>
            {/* Corner guides */}
            <div className="absolute inset-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
            </div>
            {hint && (
              <div className="absolute bottom-4 inset-x-4 text-center bg-black/70 rounded-lg py-2 px-3">
                <p className="text-sm text-red-400">{hint}</p>
              </div>
            )}
          </div>
        )}

        {scanState === 'checking' && (
          <div className="aspect-square w-full rounded-2xl bg-zinc-900 flex items-center justify-center">
            <div className="text-yellow-400 text-4xl animate-pulse">◌</div>
          </div>
        )}

        {scanState === 'unsupported' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center space-y-4">
            <div className="text-4xl">📷</div>
            <p className="font-bold text-white">In-app scanner not supported</p>
            <p className="text-sm text-zinc-400">
              Your browser doesn&apos;t support in-app QR scanning. Use your phone&apos;s
              <strong className="text-white"> Camera app</strong> to scan the QR code
              at the business counter — it will open automatically.
            </p>
          </div>
        )}

        {scanState === 'no_permission' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <p className="font-bold text-white">Camera access denied</p>
            <p className="text-sm text-zinc-400">
              Allow camera access in your browser settings, then reload. Or use
              your phone&apos;s Camera app to scan directly.
            </p>
          </div>
        )}

        {scanState === 'error' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="font-bold text-white">Camera error</p>
            <p className="text-sm text-zinc-400">
              Could not start the camera. Try using your phone&apos;s Camera app instead.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/cards" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Back to my cards
          </Link>
        </div>
      </div>
    </div>
  )
}
