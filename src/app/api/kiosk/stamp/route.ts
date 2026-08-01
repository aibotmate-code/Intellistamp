import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { RewardResult } from '@/types'
import { verifyPin } from '@/lib/pinHash'
import { checkRateLimit, peekRateLimit, resetRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'

const kioskStampSchema = z.object({
  business_id: z.string().uuid(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  pin: z.string().length(4, 'PIN must be 4 digits'),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = kioskStampSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, phone, pin } = result.data
    const ip = getClientIp(req)
    const clientHash = generateHmacIdentity('ip', ip)

    // Business and customer-by-phone lookups are independent of each other — run in parallel
    const [
      { data: business, error: bizError },
      { data: customerByPhone },
    ] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, staff_pin_hash, stamps_required, conflict_priority, reward')
        .eq('id', business_id)
        .single(),
      supabase.from('customers').select('*').eq('phone', phone).single(),
    ])

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const pinKey = `pin:kiosk:${business_id}:${clientHash}`
    const peekRl = await peekRateLimit(pinKey, 10)
    if (!peekRl.ok) {
      if (peekRl.isError) return rateLimitErrorResponse()
      return rateLimitResponse(peekRl.retryAfter || 60)
    }

    const isValid = pin && await verifyPin(pin, business.staff_pin_hash)
    if (!isValid) {
      await checkRateLimit(pinKey, 10, 5 * 60 * 1000)
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 })
    }
    
    await resetRateLimit(pinKey)

    // Find or create customer
    let customer = customerByPhone

    if (!customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ phone, whatsapp_optin: false })
        .select()
        .single()

      if (createError || !newCustomer) {
        return NextResponse.json({ error: 'Failed to find or create customer' }, { status: 500 })
      }
      customer = newCustomer
    }

    // Cooldown check (4 hours)
    const { data: lastStamp } = await supabase
      .from('stamps')
      .select('stamped_at')
      .eq('customer_id', customer.id)
      .eq('business_id', business_id)
      .order('stamped_at', { ascending: false })
      .limit(1)
      .single()

    if (lastStamp) {
      const diffMs = Date.now() - new Date(lastStamp.stamped_at).getTime()
      const fourHours = 4 * 60 * 60 * 1000
      if (diffMs < fourHours) {
        const cooldown_hours = Math.ceil((fourHours - diffMs) / (60 * 60 * 1000))
        return NextResponse.json(
          { error: 'Cooldown active', cooldown_hours },
          { status: 429 }
        )
      }
    }

    // Ensure business_customer record exists
    await supabase
      .from('business_customers')
      .upsert(
        { business_id, customer_id: customer.id },
        { onConflict: 'business_id,customer_id', ignoreDuplicates: true }
      )

    // Issue stamp
    const { data: stamp, error: stampError } = await supabase
      .from('stamps')
      .insert({ customer_id: customer.id, business_id, type: 'regular' })
      .select()
      .single()

    if (stampError || !stamp) {
      return NextResponse.json({ error: 'Failed to issue stamp' }, { status: 500 })
    }

    // Card state
    const { count: stampCount } = await supabase
      .from('stamps')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .eq('business_id', business_id)

    const total = stampCount ?? 0
    const cardStamps = total % business.stamps_required
    const cardsCompleted = Math.floor(total / business.stamps_required)
    const stampComplete = cardStamps === 0 && total > 0

    // Milestone resolution (same logic as stamp/issue) and the review_claimed lookup
    // both only depend on business_id/customer.id, not on each other — run in parallel
    const [{ data: eligibleMilestones }, { data: priorClaims }, { data: bcRow }] = await Promise.all([
      supabase
        .from('milestones')
        .select('*')
        .eq('business_id', business_id)
        .lte('visit_number', total)
        .eq('is_active', true)
        .order('visit_number', { ascending: true }),
      supabase
        .from('milestone_claims')
        .select('milestone_id')
        .eq('customer_id', customer.id)
        .eq('business_id', business_id),
      supabase
        .from('business_customers')
        .select('review_claimed')
        .eq('business_id', business_id)
        .eq('customer_id', customer.id)
        .maybeSingle(),
    ])

    const claimedMilestoneIds = new Set((priorClaims ?? []).map((c) => c.milestone_id))
    const unclaimed_milestone =
      (eligibleMilestones ?? []).find((m) => !claimedMilestoneIds.has(m.id)) ?? null

    let reward_result: RewardResult | null = null

    if (stampComplete && unclaimed_milestone) {
      if (business.conflict_priority === 'stamp') {
        reward_result = { type: 'stamp', reward: business.reward, deferred_milestone: unclaimed_milestone }
      } else {
        await supabase.from('milestone_claims').insert({
          customer_id: customer.id, business_id, milestone_id: unclaimed_milestone.id,
        })
        reward_result = { type: 'milestone', milestone: unclaimed_milestone, deferred_stamp: true }
      }
    } else if (stampComplete) {
      reward_result = { type: 'stamp', reward: business.reward }
    } else if (unclaimed_milestone) {
      await supabase.from('milestone_claims').insert({
        customer_id: customer.id, business_id, milestone_id: unclaimed_milestone.id,
      })
      reward_result = { type: 'milestone', milestone: unclaimed_milestone }
    }

    return NextResponse.json({
      success: true,
      customer_id: customer.id,
      customer_token: customer.customer_token,
      review_claimed: bcRow?.review_claimed ?? false,
      card_state: {
        total_stamps: total,
        card_stamps: stampComplete ? business.stamps_required : cardStamps,
        cards_completed: cardsCompleted,
        redeemable: stampComplete,
      },
      reward_result,
    })
  } catch (err) {
    console.error('stamp route error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
