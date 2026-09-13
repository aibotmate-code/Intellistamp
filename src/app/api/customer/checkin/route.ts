import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createPendingCheckin } from '@/lib/server/pendingCheckins'
import { checkRateLimit, getClientIp, generateHmacIdentity, rateLimitResponse, rateLimitErrorResponse } from '@/lib/rateLimit'

const checkinSchema = z.object({
  business_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  name: z.string().optional(),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = checkinSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, customer_id } = result.data

    // Rate limit checkin submissions per IP
    const ip = getClientIp(req)
    const clientHash = generateHmacIdentity('ip', ip)
    const rl = await checkRateLimit(`checkin:${clientHash}`, 15, 60 * 1000)
    if (!rl.ok) {
      if (rl.isError) return rateLimitErrorResponse()
      return rateLimitResponse(rl.retryAfter || 60)
    }

    // Verify business exists and requires staff approval (Mode C)
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, dynamic_qr_enabled, staff_pin_enabled, approval_status')
      .eq('id', business_id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (business.approval_status !== 'approved') {
      return NextResponse.json({ error: 'Business is not active' }, { status: 403 })
    }

    // Explicit Mode C check: endpoint exists strictly for static QR + staff PIN mode
    if (business.dynamic_qr_enabled !== false || business.staff_pin_enabled !== true) {
      return NextResponse.json(
        { error: 'Check-in is only available in Mode C (static QR with staff verification)' },
        { status: 400 }
      )
    }

    const { checkin, poll_token, error } = await createPendingCheckin({
      business_id,
      customer_id,
    })

    if (error || !checkin || !poll_token) {
      return NextResponse.json({ error: error || 'Failed to create check-in' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      checkin_id: checkin.id,
      poll_token,
      status: checkin.status,
      created_at: checkin.created_at,
      expires_at: checkin.expires_at,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
