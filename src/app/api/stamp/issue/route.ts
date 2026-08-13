import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stampIssueSchema } from '@/lib/validators'
import { validateServerToken } from '@/lib/server/token'
import { generateAccessGrant } from '@/lib/server/grant'
import { verifyPin } from '@/lib/pinHash'
import {
  checkRateLimit,
  peekRateLimit,
  resetRateLimit,
  rateLimitResponse,
  rateLimitErrorResponse,
  getClientIp,
  generateHmacIdentity,
} from '@/lib/rateLimit'

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
      .select('id, dynamic_qr_enabled, staff_pin_enabled, staff_pin_hash, stamps_required, conflict_priority, reward, approval_status, plan_expires_at')
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

    // ─── Flow Separation ────────────────────────────────────────────────────────
    //
    // SIGNED QR CUSTOMER FLOW:
    //   The signed HMAC token is the authorization credential. The server
    //   independently verifies the cryptographic signature and expiry.
    //   Staff PIN is NOT required — the token's validity proves the customer
    //   was physically present at the business counter when the QR was shown.
    //   This path CANNOT be triggered by a client-supplied boolean flag.
    //
    // MANUAL DASHBOARD / STAFF FLOW:
    //   No trusted signed token is present. The route falls back to staff PIN
    //   verification when staff_pin_enabled is true. Rate limiting remains active.
    //
    // The decision is made solely by the server based on cryptographic token validity.
    // ────────────────────────────────────────────────────────────────────────────

    let tokenIsVerified = false

    if (business.dynamic_qr_enabled) {
      if (!token) {
        // Dynamic QR is enabled but no token supplied → must be a manual flow
        // Fall through to staff PIN check below
      } else if (!validateServerToken(business_id, token)) {
        // Token was supplied but is invalid or expired — reject, do not fall back to PIN
        return NextResponse.json(
          { error: 'Invalid or expired token. Please scan the QR again.' },
          { status: 401 }
        )
      } else {
        // Token is cryptographically valid — this is an authenticated customer QR scan
        tokenIsVerified = true
      }
    }

    // Staff PIN check — only required when:
    //   1. staff_pin_enabled is true on the business, AND
    //   2. The request did NOT arrive with a valid server-signed QR token
    if (business.staff_pin_enabled && !tokenIsVerified) {
      const pinKey = `pin:stamp:${business_id}:${clientHash}`
      const peekRl = await peekRateLimit(pinKey, 10)
      if (!peekRl.ok) {
        if (peekRl.isError) return rateLimitErrorResponse()
        return rateLimitResponse(peekRl.retryAfter || 60)
      }

      const isValid = staff_pin && await verifyPin(staff_pin, business.staff_pin_hash)
      if (!isValid) {
        const failedRl = await checkRateLimit(pinKey, 10, 5 * 60 * 1000)
        if (failedRl.isError) return rateLimitErrorResponse()
        if (!failedRl.ok) return rateLimitResponse(failedRl.retryAfter || 60)
        return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 400 })
      }

      const resetResult = await resetRateLimit(pinKey)
      if (resetResult.isError) return rateLimitErrorResponse()
    }

    // Call atomic RPC — passes token for replay-protection only when valid
    const { data, error } = await supabase.rpc('issue_stamp_atomic', {
      p_customer_id: customer_id,
      p_business_id: business_id,
      p_type: type ?? 'regular',
      p_stamp_token: tokenIsVerified ? token : null
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
      access_grant: tokenIsVerified ? generateAccessGrant(customer_id, business_id) : undefined
    })
  } catch (err) {
    console.error('stamp issue error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
