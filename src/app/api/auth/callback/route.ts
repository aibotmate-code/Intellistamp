import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/callback
 *
 * Supabase redirects here after:
 *  - Password-reset email link clicked
 *  - (Future) OAuth or magic-link flows
 *
 * The URL contains ?code=<auth_code> which we exchange for a session.
 * After exchange, we redirect to the appropriate page based on the
 * session's `type` (recovery → /reset-password, else → /dashboard).
 *
 * Security:
 * - Only redirects to internal paths (no open redirects)
 * - Does not log the code or any tokens
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Validate the `next` param to prevent open redirects — must be a
  // relative path starting with / and not containing a protocol.
  const safeNext = /^\/[^/]/.test(next) && !next.includes('://') ? next : '/dashboard'

  if (!code) {
    // No code — could be a direct hit or a malformed link
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Expired or invalid link
      return NextResponse.redirect(
        new URL('/reset-password?error=expired', request.url)
      )
    }

    // Check what type of session this is
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.aud === 'authenticated') {
      // Recovery flow → send to reset-password page (session is now active)
      // The reset-password page will call updateUser({ password })
      return NextResponse.redirect(new URL('/reset-password', request.url))
    }

    return NextResponse.redirect(new URL(safeNext, request.url))
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=callback_failed', request.url)
    )
  }
}
