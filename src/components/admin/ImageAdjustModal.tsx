'use client'

import React, { useState, useRef, useCallback } from 'react'
import Button from '@/components/ui/Button'
import { ArrowCounterClockwise, Check, X, ArrowsOutCardinal, MagnifyingGlassPlus } from '@phosphor-icons/react'

interface ImageAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  mode: 'logo' | 'background'
  imageUrl: string
  initialX?: number | null
  initialY?: number | null
  initialScale?: number | null
  onSave: (x: number, y: number, scale: number) => void
}

export default function ImageAdjustModal({
  isOpen,
  onClose,
  title,
  mode,
  imageUrl,
  initialX,
  initialY,
  initialScale,
  onSave,
}: ImageAdjustModalProps) {
  const [x, setX] = useState<number>(() => (initialX != null && !isNaN(Number(initialX)) ? Number(initialX) : 50))
  const [y, setY] = useState<number>(() => (initialY != null && !isNaN(Number(initialY)) ? Number(initialY) : 50))
  const [scale, setScale] = useState<number>(() => (initialScale != null && !isNaN(Number(initialScale)) && Number(initialScale) > 0 ? Number(initialScale) : 1))
  const [isDragging, setIsDragging] = useState(false)

  const dragStartRef = useRef<{ startPointerX: number; startPointerY: number; startX: number; startY: number } | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragStartRef.current = {
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startX: x,
      startY: y,
    }
  }, [x, y])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !previewContainerRef.current) return
    const rect = previewContainerRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartRef.current.startPointerX
    const dy = e.clientY - dragStartRef.current.startPointerY

    // Convert pixel delta to percentage of container dimension
    // Invert delta so moving right pulls image right (shifts position percentage left/right)
    const pctDx = (dx / rect.width) * 100 * (1 / scale)
    const pctDy = (dy / rect.height) * 100 * (1 / scale)

    const nextX = Math.max(0, Math.min(100, Math.round((dragStartRef.current.startX - pctDx) * 10) / 10))
    const nextY = Math.max(0, Math.min(100, Math.round((dragStartRef.current.startY - pctDy) * 10) / 10))

    setX(nextX)
    setY(nextY)
  }, [isDragging, scale])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      setIsDragging(false)
      dragStartRef.current = null
    }
  }, [isDragging])

  const handleReset = () => {
    setX(50)
    setY(50)
    setScale(1)
  }

  const handleApply = () => {
    onSave(x, y, scale)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ArrowsOutCardinal size={18} className="text-amber-500" />
            <h3 className="font-semibold text-sm text-zinc-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Interactive Preview Canvas */}
        <div className="flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl p-6 border border-zinc-800/80 relative overflow-hidden select-none">
          <p className="text-[11px] text-zinc-500 mb-3 flex items-center gap-1.5">
            <ArrowsOutCardinal size={13} />
            <span>Click &amp; drag inside the frame to position</span>
          </p>

          {mode === 'logo' ? (
            /* Circular container matching exact StampCard logo */
            <div
              ref={previewContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-36 h-36 rounded-full bg-zinc-900 border-2 border-amber-500/80 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-lg relative touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Logo Adjust Preview"
                draggable={false}
                className="w-full h-full object-cover rounded-full pointer-events-none select-none"
                style={{
                  objectPosition: `${x}% ${y}%`,
                  transform: scale !== 1 ? `scale(${scale})` : undefined,
                  transformOrigin: `${x}% ${y}%`,
                }}
              />
            </div>
          ) : (
            /* Aspect-ratio container matching StampCard */
            <div
              ref={previewContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-full max-w-[320px] h-[180px] rounded-xl bg-zinc-900 border-2 border-amber-500/80 overflow-hidden shadow-lg relative touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: `${x}% ${y}%`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: `${x}% ${y}%`,
              }}
            />
          )}

          <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-zinc-400">
            <span>X: {Math.round(x)}%</span>
            <span>Y: {Math.round(y)}%</span>
            <span>Zoom: {scale.toFixed(2)}x</span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3.5 text-xs">
          {/* Zoom Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <MagnifyingGlassPlus size={14} className="text-amber-500" />
                <span>Zoom Scale</span>
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Precision Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-400">Horizontal (X)</span>
                <span className="font-mono text-zinc-400 text-[11px]">{Math.round(x)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={x}
                onChange={(e) => setX(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-400">Vertical (Y)</span>
                <span className="font-mono text-zinc-400 text-[11px]">{Math.round(y)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={y}
                onChange={(e) => setY(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 text-xs"
          >
            <ArrowCounterClockwise size={14} />
            <span>Reset</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 text-zinc-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="flex items-center gap-1.5 text-xs"
            >
              <Check size={14} weight="bold" />
              <span>Apply</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
