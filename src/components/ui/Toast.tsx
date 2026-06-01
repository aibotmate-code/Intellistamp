'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  exiting: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    )
    // Remove after exit animation duration (180ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random()}`
      const newToast: ToastItem = { id, type, message, exiting: false }

      setToasts((prev) => {
        // Max 3 visible — dismiss oldest if needed
        const next = [...prev, newToast]
        if (next.length > 3) {
          const oldest = next[0]
          dismiss(oldest.id)
          return next.slice(1)
        }
        return next
      })

      // Auto-dismiss: 3s for success, 5s for error/info
      const delay = type === 'success' ? 3000 : 5000
      const timer = setTimeout(() => dismiss(id), delay)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  // Clean up timers on unmount
  useEffect(() => {
    const t = timers.current
    return () => { t.forEach((timer) => clearTimeout(timer)) }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Stack ─────────────────────────────────────────────────────────────────────

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastTile key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ── Single tile ───────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  info: 'i',
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'var(--color-green)',
  error: 'var(--color-red)',
  info: 'var(--color-gold)',
}

function ToastTile({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  return (
    <div
      role="status"
      className={`toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-sm w-max${item.exiting ? ' exiting' : ''}`}
      style={{
        background: 'var(--color-elevated)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
        minWidth: 220,
      }}
    >
      {/* Icon */}
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: ICON_COLORS[item.type], color: '#000' }}
        aria-hidden="true"
      >
        {ICONS[item.type]}
      </span>

      {/* Message */}
      <span className="flex-1">{item.message}</span>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(item.id)}
        className="btn ml-1 text-lg leading-none opacity-50 hover:opacity-100"
        style={{ color: 'var(--color-text-muted)', minWidth: 24, minHeight: 24 }}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}
