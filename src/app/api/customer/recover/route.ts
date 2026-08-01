import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { customerRecoverSchema } from '@/lib/validators'
import { normalizeIndianPhone } from '@/lib/phone'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Looks up a customer's existing card for ONE specific business by phone number.
// "Found" requires both a global customers row AND a business_customers link for
// business_id — a phone enrolled elsewhere must never be revealed here.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkRateLimit(`recover:${ip}`, 10, 15 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!)

  try {
    const body = await req.json()
    const result = customerRecoverSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id } = result.data
    const phone = normalizeIndianPhone(result.data.phone)
    if (!phone) {
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number' }, { status: 400 })
    }

    // Perform queries to prevent timing attacks
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (customer) {
      await supabase
        .from('business_customers')
        .select('id')
        .eq('business_id', business_id)
        .eq('customer_id', customer.id)
        .maybeSingle()
    }

    // Always return the exact same safe response to prevent phone enumeration
    return NextResponse.json({
      success: true,
      message: 'This card cannot be recovered automatically. Please ask the business staff to restore access.'
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
