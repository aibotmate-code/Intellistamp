import Link from 'next/link'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import HomeAuthMenu from '@/components/auth/HomeAuthMenu'

export const metadata = {
  title: 'IntelliStamp — Smart Loyalty Stamps for Modern Businesses',
  description: 'Run a digital loyalty card program for your business, or view your personal stamp collection.',
}

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only */ },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const businessHref = session ? '/account' : '/login'
  const businessLabel = session ? 'My Account' : 'Business Login'

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3" aria-hidden="true">🏷️</div>
          <h1 className="text-4xl font-black text-white mb-2">IntelliStamp</h1>
          <p className="text-zinc-400 text-sm">Smart loyalty stamps for modern businesses</p>
        </div>

        {/* Business path */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-1">For Business Owners</p>
          
          {session ? (
            <HomeAuthMenu email={session.user.email ?? ''} />
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl text-base hover:bg-yellow-300 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
                aria-label="Business Login"
              >
                🏪 Business Login
              </Link>
              <Link
                href="/signup"
                className="mt-2 flex items-center justify-center gap-2 w-full border border-zinc-700 text-zinc-300 font-medium py-3 px-6 rounded-xl text-sm hover:border-zinc-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                Create Business Account
              </Link>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Customer path */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-1">For Customers</p>
          <Link
            href="/cards"
            className="flex items-center justify-center gap-2 w-full border-2 border-zinc-700 text-white font-bold py-4 px-6 rounded-xl text-base hover:border-yellow-400 hover:text-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
            aria-label="View my loyalty cards"
          >
            📱 View My Loyalty Cards
          </Link>
          <p className="mt-2 text-center text-xs text-zinc-600 px-2">
            Access your stamps and rewards using your registered mobile number.
          </p>
        </div>

        <p className="text-zinc-700 text-xs text-center mt-10">
          IntelliStamp is a product of{' '}
          <a href="https://intellicallabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-500 transition-colors">
            Intellical Labs
          </a>
        </p>
      </div>
    </main>
  )
}
