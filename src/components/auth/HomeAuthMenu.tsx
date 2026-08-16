'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
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
      <div className="text-center mb-4">
        <p className="text-sm text-zinc-400">Signed in as:</p>
        <p className="text-sm font-semibold text-white">{email}</p>
      </div>
      
      <Link
        href="/dashboard"
        className="flex items-center justify-center gap-2 w-full bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl text-base hover:bg-yellow-300 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        🏪 Go to Business Dashboard
      </Link>
      
      <div className="pt-2 text-center">
        <button 
          onClick={handleSignOutAndSwitch} 
          disabled={loading}
          className="text-sm text-zinc-500 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-800 hover:decoration-zinc-500 disabled:opacity-50"
        >
          {loading ? 'Switching...' : 'Switch account'}
        </button>
      </div>
    </div>
  )
}
