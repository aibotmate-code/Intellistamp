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
      // Don't show raw error message, show friendly message
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
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Note: GlobalTopbar is injected via layout or directly in pages, 
          but since we're replacing the dashboard header, let's keep the account page clean 
          and assume GlobalTopbar is added to the layout. */}
          
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        <div>
          <h1 className="text-3xl font-black mb-2">My Account</h1>
          <p className="text-zinc-400">Manage your account.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-8">
          
          <div>
            <p className="text-sm text-zinc-500 mb-1">Signed in as</p>
            <p className="text-lg font-bold text-white mb-3">{sessionUser.email}</p>
            <button onClick={handleLogout} className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400">
              Switch account
            </button>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <h2 className="text-lg font-bold mb-4">Security</h2>
            
            {pwdSuccess ? (
               <Alert type="success" message={pwdSuccess} />
            ) : !showPasswordForm ? (
              <button onClick={() => setShowPasswordForm(true)} className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 flex items-center gap-1">
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
                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" loading={pwdLoading}>
                    Save Password
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowPasswordForm(false); setPwdError(''); setNewPassword(''); setConfirmPassword(''); }} disabled={pwdLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-bold mb-3">Need help?</h3>
            <div className="flex items-center gap-4 text-sm font-medium">
              <a 
                href="https://wa.me/919286799934?text=Hi%20Intellical%20Labs%2C%20I%20need%20help%20with%20my%20IntelliStamp%20account." 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-white transition-colors"
              >
                WhatsApp Support
              </a>
              <span className="text-zinc-700">|</span>
              <a 
                href="mailto:hello@intellicallabs.com"
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Email Support
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <Button variant="outline" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20 w-full sm:w-auto">
              Sign Out
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  )
}
