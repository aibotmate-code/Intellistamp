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
  const allCookies = cookieStore.getAll()
  const cookieNames = allCookies.map(c => c.name)
  console.log('[DIAGNOSTIC] buildAuthClient cookies:', {
    count: cookieNames.length,
    names: cookieNames,
    hasSupabaseAuth: cookieNames.some(n => n.includes('sb-') && n.includes('-auth-token'))
  })
  
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
    const { data: { session }, error } = await client.auth.getSession()
    
    console.log('[DIAGNOSTIC] requireUser session check:', {
      hasSession: !!session,
      email: session?.user?.email || null,
      authError: error?.message || null
    })

    if (!session?.user) {
      console.log('[DIAGNOSTIC] requireUser returning 401')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.log('[DIAGNOSTIC] requireUser returning AuthUser')
    return { id: session.user.id, email: session.user.email }
  } catch (e) {
    console.error('requireUser failed with error:', e)
    console.log('[DIAGNOSTIC] requireUser returning 401 (catch)')
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
  approval_status: string
  plan_expires_at: string | null
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
    .select('id, name, slug, stamps_required, reward, staff_pin, staff_pin_hash, gmb_link, dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled, plan, conflict_priority, emoji, category, owner_id, approval_status, plan_expires_at')
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

/**
 * Returns an authorized active business.
 * Ensures the business is approved and its plan is not expired.
 * Use for operational actions (settings update, issue stamps, etc.).
 */
export async function requireActiveBusiness(
  userOrError: AuthUser | NextResponse,
  businessId: string
): Promise<AuthorizedBusiness | NextResponse> {
  const bizOrError = await requireBusiness(userOrError, businessId)
  if (bizOrError instanceof NextResponse) return bizOrError
  
  const biz = bizOrError
  
  if (biz.approval_status !== 'approved') {
    return NextResponse.json({ error: `Business is ${biz.approval_status}` }, { status: 403 })
  }
  
  if (biz.plan_expires_at && new Date(biz.plan_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Plan expired' }, { status: 403 })
  }
  
  return biz
}

/** Convenience: require user + active business in one call. */
export async function requireUserAndActiveBusiness(
  businessId: string
): Promise<AuthorizedBusiness | NextResponse> {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  return requireActiveBusiness(user, businessId)
}

/** Convenience: require user + business in one call. */
export async function requireUserAndBusiness(
  businessId: string
): Promise<AuthorizedBusiness | NextResponse> {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  return requireBusiness(user, businessId)
}

/**
 * Validates Intellical Admin access using env allowlist.
 */
export async function requireIntellicalAdmin(): Promise<AuthUser | NextResponse> {
  const userOrError = await requireUser()
  if (userOrError instanceof NextResponse) return userOrError

  const adminEmails = (process.env.INTELLICAL_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const isIntellicalAdmin = !!userOrError.email && adminEmails.includes(userOrError.email.toLowerCase())
  
  console.log('[DIAGNOSTIC] requireIntellicalAdmin result:', {
    email: userOrError.email,
    isIntellicalAdmin,
    result: isIntellicalAdmin ? 'authorized' : 'denied'
  })

  if (!isIntellicalAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return userOrError
}
