import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { customerLookupSchema } from '@/lib/validators'
import { normalizeIndianPhone } from '@/lib/phone'
import { checkRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Staff-side lookup: finds a customer by phone, scoped strictly to the
// requesting business. business_id is taken from the request body but is
// always re-validated against the authenticated owner's session below —
// a business_id the caller doesn't own is treated as "not found".
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* read-only in this handler */ },
        },
      }
    )
    const { data: { session } } = await authClient.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const result = customerLookupSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id } = result.data
    const phone = normalizeIndianPhone(result.data.phone)
    if (!phone) {
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const clientHash = generateHmacIdentity('ip', ip)
    const rl = await checkRateLimit(`pin:lookup:${business_id}:${clientHash}`, 20, 15 * 60 * 1000)
    if (!rl.ok) {
      if (rl.isError) return rateLimitErrorResponse()
      return rateLimitResponse(rl.retryAfter || 60)
    }

    // Confirm business_id actually belongs to the authenticated owner
    const { data: business } = await supabase
      .from('businesses')
      .select('id, stamps_required, reward')
      .eq('id', business_id)
      .eq('owner_id', session.user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('phone', phone)
      .maybeSingle()

    if (!customer) {
      return NextResponse.json({ found: false })
    }

    const { data: link } = await supabase
      .from('business_customers')
      .select('cards_redeemed')
      .eq('business_id', business_id)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (!link) {
      return NextResponse.json({ found: false })
    }

    const { data: stamps } = await supabase
      .from('stamps')
      .select('stamped_at')
      .eq('customer_id', customer.id)
      .eq('business_id', business_id)
      .order('stamped_at', { ascending: false })

    const total = stamps?.length ?? 0
    const cardStamps = total % business.stamps_required
    const cardsCompleted = Math.floor(total / business.stamps_required)
    const stampComplete = cardStamps === 0 && total > 0
    const cardsRedeemed = link.cards_redeemed ?? 0

    return NextResponse.json({
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      card_state: {
        total_stamps: total,
        card_stamps: stampComplete ? business.stamps_required : cardStamps,
        cards_completed: cardsCompleted,
        cards_redeemed: cardsRedeemed,
        redeemable: cardsCompleted > cardsRedeemed,
      },
      reward: business.reward,
      last_visit: stamps?.[0]?.stamped_at ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
