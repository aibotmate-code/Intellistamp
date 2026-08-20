'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState<{ id: string; email?: string } | null>(null)
  
  // Password State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    const fetchAccountData = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        startTransition(() => {
          router.push('/login')
        })
        return
      }
      
      setSessionUser({ id: session.user.id, email: session.user.email })
      
      setLoading(false)
    }
    
    fetchAccountData()
  }, [router])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')
    
    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.')
      return
    }
    
    setPwdLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwdLoading(false)
    
    if (error) {
      setPwdError('Failed to update password. Please try logging out and back in if this persists.')
      return
    }
    
    setPwdSuccess('Password changed successfully.')
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswordForm(false)
  }
  
  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    startTransition(() => {
      router.push('/login')
    })
  }

  if (loading || !sessionUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner className="text-zinc-600 w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 mb-1">My Account</h1>
          <p className="text-sm text-zinc-400">Manage your business profile and account security.</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-6 shadow-xs">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">Signed in as</p>
            <p className="text-base font-semibold text-zinc-100 mb-2">{sessionUser.email}</p>
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 cursor-pointer"
            >
              Switch account
            </button>
          </div>

          <div className="pt-6 border-t border-zinc-800/80">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">Security</h2>
            
            {pwdSuccess ? (
              <Alert type="success" message={pwdSuccess} />
            ) : !showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 flex items-center gap-1 cursor-pointer"
              >
                Change password &rsaquo;
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                {pwdError && <Alert type="error" message={pwdError} />}
                <Input
                  label="New Password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={pwdLoading}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={pwdLoading}
                />
                <div className="flex items-center gap-2.5 pt-1">
                  <Button type="submit" size="sm" loading={pwdLoading}>
                    Save Password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPwdError('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={pwdLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-6 border-t border-zinc-800/80">
            <h3 className="text-sm font-semibold text-zinc-200 mb-2">Need help?</h3>
            <div className="flex items-center gap-3 text-xs font-medium">
              <a
                href="https://wa.me/919286799934?text=Hi%20Intellical%20Labs%2C%20I%20need%20help%20with%20my%20IntelliStamp%20account."
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                WhatsApp Support
              </a>
              <span className="text-zinc-700">·</span>
              <a
                href="mailto:hello@intellicallabs.com"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Email Support
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800/80">
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
