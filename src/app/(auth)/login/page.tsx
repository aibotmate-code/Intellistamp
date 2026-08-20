'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import Logo from '@/components/brand/Logo'
import { ArrowLeft, CreditCard } from '@phosphor-icons/react'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const errParam = searchParams.get('error')
  const errCode = searchParams.get('error_code')
  const errDesc = searchParams.get('error_description') || ''
  
  const [errorDismissed, setErrorDismissed] = useState(false)
  
  let urlError: { message: string; isRecovery: boolean } | null = null
  if (!errorDismissed && (errParam || errCode)) {
    const isExpired = errCode === 'otp_expired' || 
                      errParam === 'access_denied' || 
                      errDesc.includes('expired') || 
                      errDesc.includes('invalid') || 
                      errDesc.includes('used')
    
    if (isExpired) {
      urlError = {
        message: 'Password reset link expired or already used. Request a new reset link to continue.',
        isRecovery: true
      }
    }
  }

  const handleLogin = async () => {
    setError('')
    setErrorDismissed(true)
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError('Incorrect email or password. Please try again.')
        setPassword('')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Logo size="md" className="mb-3" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Business Login</h1>
          <p className="text-xs text-zinc-400 mt-1">Sign in to manage your loyalty program</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900/60 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs backdrop-blur-xs">
          
          {urlError && (
            <div role="alert" className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3.5 flex flex-col gap-2.5">
              <p className="text-xs text-amber-300 leading-relaxed">
                {urlError.message}
              </p>
              {urlError.isRecovery && (
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center bg-zinc-100 text-zinc-950 text-xs font-medium h-7 px-3 rounded hover:bg-zinc-200 transition-colors self-start"
                >
                  Request New Reset Link
                </Link>
              )}
            </div>
          )}

          <Input
            id="login-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div>
            <div className="relative">
              <Input
                id="login-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
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
            <div className="flex justify-end mt-1.5">
              <Link
                href="/forgot-password"
                className="text-[11px] text-zinc-400 hover:text-amber-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {error && <Alert type="error" message={error} />}

          <Button
            id="login-submit"
            onClick={handleLogin}
            loading={loading}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            Sign In
          </Button>

          <p className="text-center text-xs text-zinc-400 pt-1">
            New business?{' '}
            <Link href="/signup" className="text-zinc-200 hover:underline font-medium">
              Create account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <Spinner size="md" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}
