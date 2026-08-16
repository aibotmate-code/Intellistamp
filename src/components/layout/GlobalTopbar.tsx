'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Icons } from '@/config/icons'
import Button from '@/components/ui/Button'

export default function GlobalTopbar() {
  const router = useRouter()
  const [sessionUser, setSessionUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser({ email: session.user.email })
      }
      setLoading(false)
    })
  }, [])

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
    return null
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/account" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Icons.Business size={18} className="text-zinc-400" aria-hidden="true" />
          <span className="font-black text-white">IntelliStamp</span>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-medium hidden sm:inline-block">Business</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-zinc-500 mr-2">{sessionUser.email}</span>
          <Button variant="ghost" size="sm" onClick={() => router.push('/account')} className="flex items-center gap-1">
            <Icons.Settings size={16} aria-hidden="true" /> My Account
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1 text-zinc-400 hover:text-white hover:bg-zinc-900">
            <Icons.Logout size={16} aria-hidden="true" /> Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
