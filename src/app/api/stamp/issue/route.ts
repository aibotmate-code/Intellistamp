import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { stampIssueSchema } from '@/lib/validators'
import { validateServerToken } from '@/lib/server/token'
import { verifyPin } from '@/lib/pinHash'
import { checkRateLimit, peekRateLimit, resetRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'
import type { RewardResult } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = stampIssueSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { customer_id, business_id, token, staff_pin, type } = result.data
    const ip = getClientIp(req)
    const clientHash = generateHmacIdentity('ip', ip)

    // Fetch business details
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, dynamic_qr_enabled, staff_pin_enabled, staff_pin_hash, stamps_required, conflict_priority, reward')
      .eq('id', business_id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Validate token — 401 because the token IS the authorization credential
    if (business.dynamic_qr_enabled) {
      if (!token) {
        return NextResponse.json({ error: 'Token missing.' }, { status: 401 })
      }
      if (!validateServerToken(business_id, token)) {
        return NextResponse.json({ error: 'Invalid or expired token. Please scan the QR again.' }, { status: 401 })
      }
    }

    // Validate staff PIN if required
    if (business.staff_pin_enabled) {
      const pinKey = `pin:stamp:${business_id}:${clientHash}`
      const peekRl = await peekRateLimit(pinKey, 10)
      if (!peekRl.ok) {
        if (peekRl.isError) return rateLimitErrorResponse()
        return rateLimitResponse(peekRl.retryAfter || 60)
      }

      const isValid = staff_pin && await verifyPin(staff_pin, business.staff_pin_hash)
      if (!isValid) {
        await checkRateLimit(pinKey, 10, 5 * 60 * 1000)
        return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 400 })
      }
      
      await resetRateLimit(pinKey)
    }

    // Call atomic RPC
    const { data, error } = await supabase.rpc('issue_stamp_atomic', {
      p_customer_id: customer_id,
      p_business_id: business_id,
      p_type: type ?? 'regular',
      p_stamp_token: (business.dynamic_qr_enabled && token) ? token : null
    })

    if (error) {
      return NextResponse.json({ error: 'Database error. Please try again.' }, { status: 500 })
    }

    if (data.error === 'cooldown') {
      return NextResponse.json(
        { error: `You already stamped recently. Next stamp available in ${data.hours_left}h.`, cooldown_hours: data.hours_left },
        { status: 429 }
      )
    }

    if (data.error === 'token_used') {
      return NextResponse.json(
        { error: 'Token already used. Please scan the QR code again.' },
        { status: 409 }
      )
    }

    // Construct response
    const total = data.total_stamps
    const cardStamps = total % business.stamps_required
    const cardsCompleted = Math.floor(total / business.stamps_required)
    const stampComplete = cardStamps === 0 && total > 0

    return NextResponse.json({
      success: true,
      stamp: data.stamp,
      card_state: {
        total_stamps: total,
        card_stamps: stampComplete ? business.stamps_required : cardStamps,
        cards_completed: cardsCompleted,
        can_stamp: false,
        cooldown_remaining_hours: 4,
        redeemable: stampComplete,
      },
      reward_result: data.reward_result,
    })
  } catch (err) {
    console.error('stamp issue error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

