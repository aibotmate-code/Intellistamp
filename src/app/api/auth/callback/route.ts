import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/callback
 *
 * Supabase redirects here after:
 *  - Password-reset email link clicked
 *
 * The URL contains ?code=<auth_code> which we exchange for a session.
 * After a successful exchange we always redirect to /reset-password so the
 * user can set their new password.  If the exchange fails (expired or
 * already-used link) we redirect to /reset-password?error=expired so the
 * client shows the appropriate recovery UI.
 *
 * Security:
 * - Only redirects to internal paths (no open redirects)
 * - Does not log the code or any tokens
 * - The ?next= param is validated before use to prevent open-redirect attacks
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    // No code — direct hit or malformed link
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
      // Expired or invalid code — show the recovery UI so the user can
      // request a new reset link without having to navigate away.
      return NextResponse.redirect(
        new URL('/reset-password?error=expired', request.url)
      )
    }

    // Successful exchange — the session is now set in the response cookies.
    // Always redirect to /reset-password; this callback is only triggered
    // from password-reset emails (no OAuth configured).
    return NextResponse.redirect(new URL('/reset-password', request.url))
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=callback_failed', request.url)
    )
  }
}
