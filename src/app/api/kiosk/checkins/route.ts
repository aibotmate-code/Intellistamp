import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getPendingCheckinsForBusiness, getPendingCheckin, approvePendingCheckin } from '@/lib/server/pendingCheckins'
import { verifyPin } from '@/lib/pinHash'
import { checkRateLimit, peekRateLimit, resetRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'
import { generateAccessGrant } from '@/lib/server/grant'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const approveSchema = z.object({
  business_id: z.string().uuid(),
  checkin_id: z.string(),
  pin: z.string().length(4, 'PIN must be 4 digits'),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    const checkins = getPendingCheckinsForBusiness(businessId)
    return NextResponse.json({ checkins })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { business_id, checkin_id, pin } = parsed.data
    const ip = getClientIp(req)
    const clientHash = generateHmacIdentity('ip', ip)

    // Strict tenant check: checkin must belong to business_id
    const pending = getPendingCheckin(checkin_id, business_id)
    if (!pending || pending.status !== 'pending') {
      return NextResponse.json({ error: 'Check-in request not found or expired' }, { status: 404 })
    }

    // Verify staff PIN
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, staff_pin_hash, stamps_required, reward, approval_status, plan_expires_at')
      .eq('id', business_id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (business.approval_status !== 'approved') {
      return NextResponse.json({ error: `Business is ${business.approval_status}` }, { status: 403 })
    }

    if (business.plan_expires_at && new Date(business.plan_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Plan expired' }, { status: 403 })
    }

    const pinKey = `pin:checkin:${business_id}:${clientHash}`
    const peekRl = await peekRateLimit(pinKey, 10)
    if (!peekRl.ok) {
      if (peekRl.isError) return rateLimitErrorResponse()
      return rateLimitResponse(peekRl.retryAfter || 60)
    }

    const isValid = pin && await verifyPin(pin, business.staff_pin_hash)
    if (!isValid) {
      const failedRl = await checkRateLimit(pinKey, 10, 5 * 60 * 1000)
      if (failedRl.isError) return rateLimitErrorResponse()
      if (!failedRl.ok) return rateLimitResponse(failedRl.retryAfter || 60)
      return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 400 })
    }

    await resetRateLimit(pinKey)

    // Issue stamp atomically
    const { data: stampData, error: stampError } = await supabase.rpc('issue_stamp_atomic', {
      p_customer_id: pending.customer_id,
      p_business_id: business_id,
      p_type: 'regular',
      p_stamp_token: null,
    })

    if (stampError) {
      return NextResponse.json({ error: 'Database error while issuing stamp' }, { status: 500 })
    }

    if (stampData.error === 'cooldown') {
      return NextResponse.json(
        { error: `Customer stamped recently. Next stamp available in ${stampData.hours_left}h.` },
        { status: 429 }
      )
    }

    const total = stampData.total_stamps
    const stampsReq = business.stamps_required
    const cardStamps = total % stampsReq
    const cardsCompleted = Math.floor(total / stampsReq)
    const stampComplete = cardStamps === 0 && total > 0

    const card_state = {
      total_stamps: total,
      card_stamps: stampComplete ? stampsReq : cardStamps,
      cards_completed: cardsCompleted,
      can_stamp: false,
      cooldown_remaining_hours: 4,
      redeemable: stampComplete,
    }

    let accessGrant = undefined
    try {
      accessGrant = generateAccessGrant(pending.customer_id, business_id)
    } catch {
      // non-critical
    }

    const checkinResult = {
      card_state,
      reward_result: stampData.reward_result || (stampComplete && business.reward ? { type: 'stamp' as const, reward: business.reward } : null),
      access_grant: accessGrant,
      new_stamp_index: card_state.card_stamps - 1,
    }

    approvePendingCheckin(checkin_id, business_id, checkinResult)

    return NextResponse.json({
      success: true,
      result: checkinResult,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
