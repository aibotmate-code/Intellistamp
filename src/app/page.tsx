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

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="w-full max-w-sm">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mx-auto mb-3 shadow-xs">
            🏷️
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">IntelliStamp</h1>
          <p className="text-xs text-zinc-400 mt-1">Smart loyalty cards &amp; counter displays for businesses</p>
        </div>

        {/* Business Section */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-0.5">For Business Owners</p>
          
          {session ? (
            <HomeAuthMenu email={session.user.email ?? ''} />
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full bg-zinc-100 text-zinc-950 font-medium py-2.5 px-4 rounded-md text-sm hover:bg-zinc-200 transition-colors shadow-xs"
                aria-label="Business Login"
              >
                Business Login
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 w-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium py-2.5 px-4 rounded-md text-sm hover:bg-zinc-850 hover:text-white transition-colors"
              >
                Create Business Account
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-zinc-800/80" />
          <span className="text-[11px] text-zinc-600">or</span>
          <div className="flex-1 h-px bg-zinc-800/80" />
        </div>

        {/* Customer Section */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-0.5">For Customers</p>
          <Link
            href="/cards"
            className="flex items-center justify-center gap-2 w-full border border-zinc-800 bg-zinc-900/40 text-zinc-200 font-medium py-2.5 px-4 rounded-md text-sm hover:border-zinc-700 hover:text-white transition-colors shadow-xs"
            aria-label="View my loyalty cards"
          >
            📱 View My Loyalty Cards
          </Link>
          <p className="text-center text-[11px] text-zinc-500 px-2 leading-relaxed">
            Access your stamps and rewards with your mobile number.
          </p>
        </div>

        <p className="text-zinc-600 text-[11px] text-center mt-10">
          IntelliStamp · A product of{' '}
          <a href="https://intellicallabs.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-400 transition-colors underline">
            Intellical Labs
          </a>
        </p>
      </div>
    </main>
  )
}
