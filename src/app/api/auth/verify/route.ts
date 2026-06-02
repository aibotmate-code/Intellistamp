import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { otpVerifySchema } from '@/lib/validators'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const result = otpVerifySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { phone, otp } = result.data

    // Find latest unused, non-expired OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_store')
      .select('*')
      .eq('phone', phone)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
    }

    if (!timingSafeEqual(otpRecord.otp, otp)) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // Mark OTP as used
    await supabase.from('otp_store').update({ used: true }).eq('id', otpRecord.id)

    // Find or create customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single()

    let customer = existingCustomer
    let isNewCustomer = false

    if (!customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ phone, whatsapp_optin: true })
        .select()
        .single()

      if (createError || !newCustomer) {
        return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
      }

      customer = newCustomer
      isNewCustomer = true
    }

    const response = NextResponse.json({ success: true, customer, isNewCustomer })
    response.cookies.set('customer_session', JSON.stringify({ id: customer.id, phone: customer.phone, customer_token: customer.customer_token }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
