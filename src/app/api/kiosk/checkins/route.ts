import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getPendingCheckinsForBusiness, approvePendingCheckin } from '@/lib/server/pendingCheckins'
import { verifyPin } from '@/lib/pinHash'
import { checkRateLimit, peekRateLimit, resetRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const approveSchema = z.object({
  business_id: z.string().uuid(),
  checkin_id: z.string().uuid(),
  pin: z.string().length(4, 'PIN must be 4 digits'),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    const checkins = await getPendingCheckinsForBusiness(businessId)
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

    // Verify staff PIN & business status
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

    const isValid = pin && (await verifyPin(pin, business.staff_pin_hash))
    if (!isValid) {
      const failedRl = await checkRateLimit(pinKey, 10, 5 * 60 * 1000)
      if (failedRl.isError) return rateLimitErrorResponse()
      if (!failedRl.ok) return rateLimitResponse(failedRl.retryAfter || 60)
      return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 400 })
    }

    await resetRateLimit(pinKey)

    // Atomically approve the pending check-in using Postgres row lock + issue_stamp_atomic RPC
    const approveResult = await approvePendingCheckin(checkin_id, business_id)

    if (!approveResult.success) {
      const errMsg = approveResult.error || 'Failed to approve check-in'
      if (errMsg.includes('not_found') || errMsg.includes('not found')) {
        return NextResponse.json({ error: 'Check-in request not found' }, { status: 404 })
      }
      if (errMsg.includes('cooldown') || errMsg.includes('stamped recently')) {
        return NextResponse.json({ error: errMsg }, { status: 429 })
      }
      if (errMsg.includes('expired')) {
        return NextResponse.json({ error: 'Check-in request expired' }, { status: 400 })
      }
      if (errMsg.includes('already')) {
        return NextResponse.json({ error: 'Check-in already processed' }, { status: 400 })
      }
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      result: approveResult.stamp_result,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
