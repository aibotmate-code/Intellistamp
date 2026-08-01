'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
      // Pushing to dashboard drops all query parameters, fulfilling the non-persistence requirement
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2" aria-hidden="true">🏷️</div>
          <h1 className="text-2xl font-black text-white">Business Login</h1>
          <p className="text-zinc-400 text-sm mt-1">Sign in to your business dashboard</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          
          {urlError && (
            <div role="alert" className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-2 flex flex-col gap-3">
              <p className="text-sm text-yellow-200/90 leading-relaxed">
                {urlError.message}
              </p>
              {urlError.isRecovery && (
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center bg-yellow-400 text-yellow-950 text-sm font-semibold h-9 px-4 rounded-md hover:bg-yellow-500 transition-colors self-start"
                >
                  Request New Reset Link
                </Link>
              )}
            </div>
          )}

          <Input
            id="login-email"
            label="Email"
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
                className="absolute right-3 bottom-3 text-xs text-zinc-400 hover:text-white select-none"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {/* Forgot password — close to password field */}
            <div className="flex justify-end mt-1.5">
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            id="login-submit"
            onClick={handleLogin}
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            Sign In →
          </Button>

          <p className="text-center text-sm text-zinc-500">
            New business?{' '}
            <Link href="/signup" className="text-yellow-400 hover:underline font-medium">
              Create account →
            </Link>
          </p>
        </div>

        {/* Escape routes — always visible */}
        <nav aria-label="Other options" className="mt-6 flex flex-col items-center gap-2">
          <Link
            href="/cards"
            className="text-sm text-zinc-300 hover:text-yellow-400 transition-colors font-medium"
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}
