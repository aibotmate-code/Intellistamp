import Link from 'next/link'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import HomeAuthMenu from '@/components/auth/HomeAuthMenu'
import Logo from '@/components/brand/Logo'
import IntellicalLabsAttribution from '@/components/brand/IntellicalLabsAttribution'
import { CreditCard, Storefront, UserPlus } from '@phosphor-icons/react/dist/ssr'

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
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm">

        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="lg" withAttribution={true} className="mb-3" />
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
                className="flex items-center justify-center gap-2 w-full bg-amber-500 text-zinc-950 font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-amber-400 transition-colors shadow-xs"
                aria-label="Business Login"
              >
                <Storefront size={16} weight="bold" />
                <span>Business Login</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 w-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium py-2.5 px-4 rounded-md text-sm hover:bg-zinc-850 hover:text-white transition-colors"
              >
                <UserPlus size={16} />
                <span>Create Business Account</span>
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
            <CreditCard size={16} weight="duotone" className="text-amber-500" />
            <span>View My Loyalty Cards</span>
          </Link>
          <p className="text-center text-[11px] text-zinc-500 px-2 leading-relaxed">
            Access your stamps and rewards with your mobile number.
          </p>
        </div>

        <div className="text-center mt-10">
          <IntellicalLabsAttribution size="xs" />
        </div>
      </div>
    </main>
  )
}
