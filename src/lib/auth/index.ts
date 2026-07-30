/**
 * Server-only authentication and authorization helpers.
 * Never import this file in client components — it reads cookies via next/headers.
 */
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Service-role client for privileged reads after authorization is confirmed.
// Import from this module rather than creating additional module-scope clients.
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Build a session-aware client from the request cookies (anon-key, subject to RLS). */
export async function buildAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in route handlers */ },
      },
    }
  )
}

/** Authenticated Supabase user from the server-side session cookie. */
export type AuthUser = { id: string; email?: string }

/**
 * Returns the authenticated user or a 401 NextResponse.
 * Use as:
 *   const userOrError = await requireUser()
 *   if (userOrError instanceof NextResponse) return userOrError
 */
export async function requireUser(): Promise<AuthUser | NextResponse> {
  try {
    const client = await buildAuthClient()
    const { data: { session } } = await client.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return { id: session.user.id, email: session.user.email }
  } catch (e) {
    console.error('requireUser failed with error:', e)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export interface AuthorizedBusiness {
  id: string
  name: string
  slug: string
  stamps_required: number
  reward: string
  staff_pin: string
  staff_pin_hash: string | null
  gmb_link: string | null
  dynamic_qr_enabled: boolean
  staff_pin_enabled: boolean
  whatsapp_enabled: boolean
  plan: string
  conflict_priority: string
  emoji: string
  category: string
  owner_id: string
}

/**
 * Returns an authorized business or a 401/403/404 NextResponse.
 * Authorization is based solely on the authenticated session —
 * the caller-supplied businessId is verified against owner_id from the DB.
 *
 * No membership table exists yet; this uses owner_id only.
 * When business_memberships is added, extend this function.
 */
export async function requireBusiness(
  userOrError: AuthUser | NextResponse,
  businessId: string
): Promise<AuthorizedBusiness | NextResponse> {
  if (userOrError instanceof NextResponse) return userOrError

  const { data: business, error } = await adminClient
    .from('businesses')
    .select('id, name, slug, stamps_required, reward, staff_pin, staff_pin_hash, gmb_link, dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled, plan, conflict_priority, emoji, category, owner_id')
    .eq('id', businessId)
    .maybeSingle()

  if (error || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const biz = business as unknown as AuthorizedBusiness
  if (biz.owner_id !== userOrError.id) {
    // Return 404 not 403 to avoid confirming the business exists to non-owners
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  return biz
}

/** Convenience: require user + business in one call. */
export async function requireUserAndBusiness(
  businessId: string
): Promise<AuthorizedBusiness | NextResponse> {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  return requireBusiness(user, businessId)
}
