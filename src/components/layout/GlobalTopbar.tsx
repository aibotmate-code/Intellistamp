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
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/account" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Icons.Business size={16} className="text-zinc-400" aria-hidden="true" />
          <span className="font-semibold text-sm tracking-tight text-zinc-100">IntelliStamp</span>
          <span className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium hidden sm:inline-block">
            Business
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="hidden md:block text-xs text-zinc-400 mr-2">{sessionUser.email}</span>
          <Button variant="ghost" size="sm" onClick={() => router.push('/account')} className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Icons.Settings size={14} aria-hidden="true" /> My Account
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
            <Icons.Logout size={14} aria-hidden="true" /> Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
