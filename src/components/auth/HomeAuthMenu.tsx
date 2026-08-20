'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useState, startTransition } from 'react'

interface HomeAuthMenuProps {
  email: string
}

export default function HomeAuthMenu({ email }: HomeAuthMenuProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOutAndSwitch = async () => {
    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    startTransition(() => {
      router.push('/login')
    })
  }

  return (
    <div className="space-y-3 w-full">
      <div className="text-center mb-3">
        <p className="text-xs text-zinc-400">Signed in as:</p>
        <p className="text-xs font-semibold text-zinc-100 truncate">{email}</p>
      </div>
      
      <Link
        href="/dashboard"
        className="flex items-center justify-center gap-2 w-full bg-zinc-100 text-zinc-950 font-medium py-2.5 px-4 rounded-md text-sm hover:bg-zinc-200 transition-colors shadow-xs"
      >
        Go to Business Dashboard →
      </Link>
      
      <div className="pt-1 text-center">
        <button 
          onClick={handleSignOutAndSwitch} 
          disabled={loading}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Switching...' : 'Switch account'}
        </button>
      </div>
    </div>
  )
}
