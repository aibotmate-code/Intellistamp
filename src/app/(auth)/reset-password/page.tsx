'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type FlowState = 'loading' | 'ready' | 'expired' | 'success'

// ── Inner component that uses useSearchParams ────────────────────────────────
// Must be inside a <Suspense> boundary at page level for static pre-rendering.
function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const [flow, setFlow] = useState<FlowState>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const urlError = searchParams.get('error')

    if (urlError === 'expired') {
      const nextFlow: FlowState = 'expired'
      queueMicrotask(() => setFlow(nextFlow))
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextFlow: FlowState = session?.user ? 'ready' : 'expired'
      setFlow(nextFlow)
    })
  }, [searchParams])

  const handleReset = async () => {
    setError('')
    if (!password) { setError('Please enter a new password'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.')
        return
      }
      await supabase.auth.signOut()
      setFlow('success')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (flow === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Verifying reset link…</p>
        </div>
      </div>
    )
  }

  if (flow === 'expired') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4" aria-hidden="true">⏳</div>
          <h1 className="text-2xl font-black text-white mb-3">Link Expired or Invalid</h1>
          <p className="text-zinc-400 text-sm mb-8">
            This password-reset link has expired or has already been used.
            Request a new link to try again.
          </p>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <Link
              href="/forgot-password"
              className="flex items-center justify-center w-full bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
          <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
            <Link href="/login" className="text-sm text-zinc-300 hover:text-yellow-400 transition-colors font-medium">
              ← Back to Business Login
            </Link>
            <Link href="/cards" className="text-sm text-zinc-400 hover:text-yellow-400 transition-colors">
              📱 View My Loyalty Cards
            </Link>
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to Home
            </Link>
          </nav>
        </div>
      </div>
    )
  }

  if (flow === 'success') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4" aria-hidden="true">✅</div>
          <h1 className="text-2xl font-black text-white mb-3">Password Updated</h1>
          <p className="text-zinc-400 text-sm mb-8">
            Your password has been changed successfully. Sign in with your new password.
          </p>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <Link
              href="/login"
              className="flex items-center justify-center w-full bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              Sign In to Dashboard →
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // flow === 'ready'
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2" aria-hidden="true">🔒</div>
          <h1 className="text-2xl font-black text-white">Set New Password</h1>
          <p className="text-zinc-400 text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div className="relative">
            <Input
              id="reset-password"
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 bottom-3 text-xs text-zinc-400 hover:text-white select-none"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="relative">
            <Input
              id="reset-confirm"
              label="Confirm New Password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute right-3 bottom-3 text-xs text-zinc-400 hover:text-white select-none"
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>

          <p className="text-xs text-zinc-500">Minimum 8 characters required.</p>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            id="reset-submit"
            onClick={handleReset}
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            Update Password →
          </Button>
        </div>

        <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
          <Link href="/login" className="text-sm text-zinc-300 hover:text-yellow-400 transition-colors font-medium">
            ← Back to Business Login
          </Link>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to Home
          </Link>
        </nav>
      </div>
    </div>
  )
}

// ── Page wrapper — required Suspense boundary for useSearchParams ────────────
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">Loading…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
