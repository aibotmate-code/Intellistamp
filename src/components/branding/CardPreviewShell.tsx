'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'

interface CardPreviewShellProps {
  children: React.ReactNode
  /**
   * Canonical card design width in pixels.
   * Default: 384px (matches Tailwind max-w-sm = 24rem).
   */
  designWidth?: number
  className?: string
}

/**
 * CardPreviewShell
 * 
 * Provides responsive, proportional scaling for StampCard in admin & business previews.
 * - If available container width >= designWidth (384px): renders at 100% scale, centered.
 * - If container width < designWidth: scales the ENTIRE StampCard proportionally as one visual unit
 *   (logo, business name, visit counter, stamps, gift markers, milestone sequences, footer, borders).
 * - Outer wrapper height tracks the scaled height precisely to prevent empty blank space or overlap.
 * - Never clips stamps, borders, or footers horizontally.
 */
export default function CardPreviewShell({
  children,
  designWidth = 384,
  className = '',
}: CardPreviewShellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number>(1)
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined)

  const updateDimensions = useCallback(() => {
    const container = containerRef.current
    const card = cardRef.current
    if (!container || !card) return

    const availableWidth = container.clientWidth
    if (availableWidth > 0) {
      const rawScale = Math.min(1, availableWidth / designWidth)
      const nextScale = Math.round(rawScale * 10000) / 10000
      setScale(nextScale)
    }

    const unscaledHeight = card.offsetHeight
    if (unscaledHeight > 0) {
      setCardHeight(unscaledHeight)
    }
  }, [designWidth])

  useEffect(() => {
    const container = containerRef.current
    const card = cardRef.current
    if (!container || !card) return

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateDimensions()
      })
      observer.observe(container)
      observer.observe(card)
    } else {
      window.addEventListener('resize', updateDimensions)
    }

    // Schedule initial dimension sync asynchronously
    const timer = setTimeout(updateDimensions, 0)

    return () => {
      clearTimeout(timer)
      if (observer) {
        observer.disconnect()
      } else {
        window.removeEventListener('resize', updateDimensions)
      }
    }
  }, [updateDimensions])

  // Proportionally adjust outer container height when scaled down
  const isScaled = scale < 1
  const scaledHeight = isScaled && cardHeight !== undefined
    ? Math.ceil(cardHeight * scale)
    : undefined

  return (
    <div
      ref={containerRef}
      data-testid="card-preview-shell"
      className={`w-full relative flex justify-center items-start min-w-0 ${className}`}
      style={{
        height: scaledHeight !== undefined ? `${scaledHeight}px` : 'auto',
      }}
    >
      <div
        data-testid="card-preview-scaler"
        style={{
          width: `${designWidth}px`,
          transform: isScaled ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
          position: isScaled ? 'absolute' : 'relative',
          top: 0,
          left: isScaled ? '50%' : undefined,
          marginLeft: isScaled ? `-${designWidth / 2}px` : undefined,
          flexShrink: 0,
        }}
      >
        <div ref={cardRef} className="w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
