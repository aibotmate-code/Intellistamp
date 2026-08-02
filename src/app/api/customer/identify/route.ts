import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkRateLimit, rateLimitResponse, rateLimitErrorResponse, getClientIp, generateHmacIdentity } from '@/lib/rateLimit'
import { validateServerToken } from '@/lib/server/token'

const schema = z.object({
  business_id: z.string().uuid(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  name: z.string().min(1).max(100).optional(),
  qr_token: z.string().optional(),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const clientHash = generateHmacIdentity('ip', ip)
  const rl = await checkRateLimit(`identify:${clientHash}`, 10, 15 * 60 * 1000)
  if (!rl.ok) {
    if (rl.isError) return rateLimitErrorResponse()
    return rateLimitResponse(rl.retryAfter || 60)
  }

  try {
    const body = await req.json()
    if (typeof body.phone === 'string') {
      body.phone = body.phone.replace(/^\+91/, '')
    }

    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, phone, name, qr_token } = result.data

    // Verify QR token first — determines what paths are available
    const qrIsValid = qr_token ? validateServerToken(business_id, qr_token) : false

    // Look up existing customer by phone
    const { data: existing } = await supabase
      .from('customers')
      .select('id, customer_token, name')
      .eq('phone', phone)
      .maybeSingle()

    // ── RETURNING CUSTOMER ────────────────────────────────────────────────────
    if (existing) {
      if (qrIsValid) {
        // Valid signed QR: associate the customer with this business (idempotent)
        // and tell the client to proceed to stamp — do NOT return customer_token
        // (phone alone is not proof of ownership without OTP)
        await supabase
          .from('business_customers')
          .upsert(
            { business_id, customer_id: existing.id },
            { onConflict: 'business_id,customer_id', ignoreDuplicates: true }
          )

        return NextResponse.json({
          success: true,
          isNew: false,
          readyToStamp: true,         // ← client: skip recovery wall, proceed to stamp
          customer_id: existing.id,   // ← needed for stamp call, not a bearer secret
          name: existing.name,
        })
      }

      // No valid QR — cannot recover automatically without staff assistance
      // CRITICAL: Never return customer_token here (no proof of phone ownership)
      return NextResponse.json({
        success: true,
        isNew: false,
        readyToStamp: false,
        message: 'This card cannot be recovered automatically. Please ask the business staff to restore access.',
      })
    }

    // ── NEW CUSTOMER ──────────────────────────────────────────────────────────
    if (!qrIsValid) {
      return NextResponse.json({
        error: 'Invalid or expired QR code. Please scan the QR code again.'
      }, { status: 400 })
    }

    // Need name before we can create the account
    if (!name) {
      return NextResponse.json({
        success: true,
        isNew: true,
        needsName: true
      })
    }

    // Create the customer with a QR-verified phone and name
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ phone, name })
      .select()
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
    }

    // Link to the business immediately
    await supabase
      .from('business_customers')
      .upsert({ business_id, customer_id: customer.id })

    // Safe to return the token — customer just registered, this is their first session
    return NextResponse.json({ customer, isNew: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
