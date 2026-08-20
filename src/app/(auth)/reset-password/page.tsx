'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'

type FlowState = 'loading' | 'ready' | 'expired' | 'success'

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
          <Spinner size="md" className="mx-auto mb-3" />
          <p className="text-zinc-400 text-xs">Verifying reset link…</p>
        </div>
      </div>
    )
  }

  if (flow === 'expired') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
        <div className="w-full max-w-sm text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mx-auto mb-3 shadow-xs">
            ⏳
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">Link Expired</h1>
          <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
            This password-reset link has expired or has already been used.
            Request a new link to try again.
          </p>
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800 shadow-xs">
            <Link
              href="/forgot-password"
              className="flex items-center justify-center w-full bg-zinc-100 text-zinc-950 text-xs font-medium h-9 px-4 rounded-md hover:bg-zinc-200 transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
          <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
            <Link href="/login" className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors font-medium">
              ← Back to Business Login
            </Link>
            <Link href="/" className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to Home
            </Link>
          </nav>
        </div>
      </div>
    )
  }

  if (flow === 'success') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
        <div className="w-full max-w-sm text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mx-auto mb-3 shadow-xs">
            ✅
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">Password Updated</h1>
          <p className="text-zinc-400 text-xs mb-6">
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800 shadow-xs">
            <Link
              href="/login"
              className="flex items-center justify-center w-full bg-zinc-100 text-zinc-950 text-xs font-medium h-9 px-4 rounded-md hover:bg-zinc-200 transition-colors"
            >
              Sign In to Dashboard →
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/" className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // flow === 'ready'
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mx-auto mb-3 shadow-xs">
            🔒
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Set New Password</h1>
          <p className="text-xs text-zinc-400 mt-1">Choose a strong password for your business account.</p>
        </div>

        <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
          <div className="relative">
            <Input
              id="reset-password"
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 bottom-2 text-xs text-zinc-400 hover:text-zinc-200 select-none cursor-pointer"
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
              className="absolute right-3 bottom-2 text-xs text-zinc-400 hover:text-zinc-200 select-none cursor-pointer"
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <Alert type="error" message={error} />}

          <Button
            id="reset-submit"
            onClick={handleReset}
            loading={loading}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            Update Password
          </Button>
        </div>

        <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
          <Link href="/login" className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors font-medium">
            ← Back to Business Login
          </Link>
          <Link href="/" className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to Home
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
