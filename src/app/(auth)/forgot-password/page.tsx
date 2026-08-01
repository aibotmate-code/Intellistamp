'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type FlowState = 'form' | 'sent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [flow, setFlow] = useState<FlowState>('form')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email.trim()) { setError('Please enter your email address'); return }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Determine the redirect URL — must route through /api/auth/callback
      // to exchange the Supabase auth code for a session before hitting
      // the reset-password UI page.
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '')

      // We intentionally call resetPasswordForEmail regardless of whether
      // the email exists — this prevents user enumeration attacks.
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/api/auth/callback`,
      })

      // Always show success — never reveal whether the email exists
      setFlow('sent')
    } catch {
      // Surface generic errors (network etc.) but not auth-specific ones
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  if (flow === 'sent') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4" aria-hidden="true">📬</div>
          <h1 className="text-2xl font-black text-white mb-3">Check your inbox</h1>
          <p className="text-zinc-400 text-sm mb-2">
            If an account exists for{' '}
            <span className="text-zinc-200 font-medium">{email}</span>,
            you&apos;ll receive a password-reset link shortly.
          </p>
          <p className="text-zinc-500 text-xs mb-8">
            Didn&apos;t receive it? Check your spam folder or request another link below.
          </p>

          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-3">
            <Button
              onClick={() => { setFlow('form'); setError('') }}
              className="w-full"
              variant="ghost"
            >
              Send another link
            </Button>
          </div>

          <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-zinc-300 hover:text-yellow-400 transition-colors font-medium"
            >
              ← Back to Business Login
            </Link>
            <Link
              href="/cards"
              className="text-sm text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              📱 View My Loyalty Cards
            </Link>
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </nav>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2" aria-hidden="true">🔑</div>
          <h1 className="text-2xl font-black text-white">Forgot Password?</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Enter your business email and we&apos;ll send a reset link.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <Input
            id="forgot-email"
            label="Business Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            id="forgot-submit"
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            Send Reset Link →
          </Button>
        </div>

        {/* Escape routes */}
        <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-zinc-300 hover:text-yellow-400 transition-colors font-medium"
          >
            ← Back to Business Login
          </Link>
          <Link
            href="/cards"
            className="text-sm text-zinc-400 hover:text-yellow-400 transition-colors"
          >
            📱 View My Loyalty Cards
          </Link>
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </nav>

      </div>
    </div>
  )
}
