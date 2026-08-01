import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { validateServerToken } from '@/lib/server/token'

const schema = z.object({
  business_id: z.string().uuid(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  name: z.string().min(1).max(100).optional(),
  qr_token: z.string().optional(), // We'll enforce this strictly in Patch 2
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkRateLimit(`identify:${ip}`, 10, 15 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!)

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

    // 1. Perform lookup
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      // CRITICAL LEAK PATCH: Never return the bearer token for an existing customer.
      // Phone + QR is not proof of phone ownership (no OTP).
      return NextResponse.json({
        success: true,
        isNew: false,
        message: 'This card cannot be recovered automatically. Please ask the business staff to restore access.',
      })
    }

    // 2. New Customer Creation
    if (!qr_token || !validateServerToken(business_id, qr_token)) {
      return NextResponse.json({
        success: true,
        isNew: false,
        message: 'This card cannot be recovered automatically. Please ask the business staff to restore access.',
      })
    }

    // If name is not provided yet, the UI is just checking if they exist to prompt for name
    if (!name) {
      return NextResponse.json({
        success: true,
        isNew: true,
        needsName: true
      })
    }

    // Since they have a QR token and provided a name, we can create a new customer.
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ phone, name })
      .select()
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
    }

    // Also link them to the business
    await supabase
      .from('business_customers')
      .upsert({ business_id, customer_id: customer.id })

    // Safe to return the newly generated token since they just registered
    return NextResponse.json({ customer, isNew: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
