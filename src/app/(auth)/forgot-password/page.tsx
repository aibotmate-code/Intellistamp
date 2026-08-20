'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { getAppOrigin } from '@/lib/origin'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import IntelliStampLogo from '@/components/brand/IntelliStampLogo'
import { EnvelopeSimple, ArrowLeft, CreditCard } from '@phosphor-icons/react'

type FlowState = 'form' | 'sent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [flow, setFlow] = useState<FlowState>('form')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email.trim()) { setError('Please enter your email address'); return }
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

      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${getAppOrigin()}/api/auth/callback`,
      })

      setFlow('sent')
    } catch {
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 is-dot-grid">
        <div className="w-full max-w-sm text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 mx-auto mb-3 shadow-xs">
            <EnvelopeSimple size={22} weight="duotone" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">Check your inbox</h1>
          <p className="text-zinc-400 text-xs mb-2 leading-relaxed">
            If an account exists for{' '}
            <span className="text-zinc-200 font-medium">{email}</span>,
            you&apos;ll receive a password-reset link shortly.
          </p>
          <p className="text-zinc-500 text-[11px] mb-6">
            Didn&apos;t receive it? Check your spam folder or request another link below.
          </p>

          <div className="bg-zinc-900/60 rounded-lg p-5 border border-zinc-800 space-y-3 shadow-xs">
            <Button
              onClick={() => { setFlow('form'); setError('') }}
              className="w-full"
              variant="outline"
              size="sm"
            >
              Send another link
            </Button>
          </div>

          <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
            <Link
              href="/login"
              className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              <span>Back to Business Login</span>
            </Link>
            <Link
              href="/"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              <span>Back to Home</span>
            </Link>
          </nav>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <IntelliStampLogo size="md" withAttribution={true} className="mb-3" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Forgot Password?</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enter your business email to receive a password reset link.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900/60 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
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

          {error && <Alert type="error" message={error} />}

          <Button
            id="forgot-submit"
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            Send Reset Link
          </Button>
        </div>

        {/* Escape routes */}
        <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/login"
            className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            <span>Back to Business Login</span>
          </Link>
          <Link
            href="/cards"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
          >
            <CreditCard size={14} weight="duotone" className="text-amber-500" />
            <span>View Customer Loyalty Cards</span>
          </Link>
          <Link
            href="/"
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            <span>Back to Home</span>
          </Link>
        </nav>

      </div>
    </div>
  )
}
