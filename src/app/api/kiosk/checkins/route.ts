import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPendingCheckinsForBusiness, approvePendingCheckin } from '@/lib/server/pendingCheckins'
import { verifyPin } from '@/lib/pinHash'
import { checkRateLimit, peekRateLimit, resetRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'
import { requireUser, requireActiveBusiness } from '@/lib/auth'

const approveSchema = z.object({
  business_id: z.string().uuid(),
  checkin_id: z.string().uuid(),
  pin: z.string().length(4, 'PIN must be 4 digits'),
})

export async function GET(req: NextRequest) {
  try {
    const userOrError = await requireUser()
    if (userOrError instanceof NextResponse) return userOrError

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    const bizOrError = await requireActiveBusiness(userOrError, businessId)
    if (bizOrError instanceof NextResponse) return bizOrError

    const checkins = await getPendingCheckinsForBusiness(businessId)
    return NextResponse.json({ checkins })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userOrError = await requireUser()
    if (userOrError instanceof NextResponse) return userOrError

    const body = await req.json()
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { business_id, checkin_id, pin } = parsed.data

    const bizOrError = await requireActiveBusiness(userOrError, business_id)
    if (bizOrError instanceof NextResponse) return bizOrError
    const business = bizOrError

    const ip = getClientIp(req)
    const clientHash = generateHmacIdentity('ip', ip)

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
    const approveResult = await approvePendingCheckin(checkin_id, business_id, userOrError.id)

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
