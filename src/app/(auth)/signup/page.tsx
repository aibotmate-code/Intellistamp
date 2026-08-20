'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Logo from '@/components/brand/Logo'
import { ArrowLeft, CreditCard } from '@phosphor-icons/react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Signup failed'); return }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); return }

      router.push('/onboarding')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Logo size="md" withAttribution={true} className="mb-3" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Create Business Account</h1>
          <p className="text-xs text-zinc-400 mt-1">Set up your smart loyalty stamp program in minutes</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900/60 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs backdrop-blur-xs">
          <Input
            id="signup-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <Input
              id="signup-password"
              label="Password"
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
              id="signup-confirm"
              label="Confirm Password"
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
            id="signup-submit"
            onClick={handleSignup}
            loading={loading}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            Create Account
          </Button>

          <p className="text-center text-xs text-zinc-400 pt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-zinc-200 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Escape routes */}
        <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/cards"
            className="text-xs text-zinc-300 hover:text-zinc-100 transition-colors font-medium inline-flex items-center gap-1.5"
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
