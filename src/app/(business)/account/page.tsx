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
    
    setPwdSuccess('Your password has been successfully updated.')
    setNewPassword('')
    setConfirmPassword('')
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
          <p className="text-zinc-400">Manage your profile, security, and linked businesses.</p>
        </div>

        {/* PROFILE */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300">
                {sessionUser.email}
              </div>
            </div>
          </div>
        </section>
        

        


        {/* SECURITY */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Security</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
            {pwdError && <Alert type="error" message={pwdError} />}
            {pwdSuccess && <Alert type="success" message={pwdSuccess} />}
            
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
            <Button type="submit" loading={pwdLoading}>
              Change Password
            </Button>
          </form>
        </section>

        {/* SUPPORT & LOGOUT */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h3 className="font-bold mb-2">Need Help?</h3>
              <div className="flex items-center gap-3">
                <a 
                  href="https://wa.me/919286799934?text=Hi%20Intellical%20Labs%2C%20I%20need%20help%20with%20my%20IntelliStamp%20account." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  WhatsApp Support
                </a>
                <a 
                  href="mailto:hello@intellicallabs.com"
                  className="text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Email Support
                </a>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20 w-full sm:w-auto">
              Sign Out
            </Button>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h3 className="font-bold mb-1">Switch Business Account</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Sign out and log in with a different business owner&apos;s account.
            </p>
            <Button variant="secondary" onClick={handleLogout} className="w-full sm:w-auto text-zinc-300 hover:text-white">
              Switch Business Account
            </Button>
          </div>
        </section>

      </div>
    </div>
  )
}
