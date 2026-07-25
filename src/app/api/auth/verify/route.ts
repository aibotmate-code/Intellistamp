import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { phoneSchema, otpVerifySchema } from '@/lib/validators'
import { rateLimiter, rateLimitResponse } from '@/lib/rateLimit'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Send OTP (phone only) ────────────────────────────────────────────────
    if (!body.otp) {
      const result = phoneSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
      }
      const { phone } = result.data

      const rlSend = rateLimiter.check(`otp-send:${phone}`, 5, 15 * 60 * 1000)
      if (!rlSend.ok) return rateLimitResponse(rlSend.retryAfter!)

      const { data: recentOtp } = await supabase
        .from('otp_store')
        .select('created_at')
        .eq('phone', phone)
        .eq('used', false)
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (recentOtp && recentOtp.length > 0) {
        return NextResponse.json(
          { error: 'Please wait 60 seconds before requesting another OTP' },
          { status: 429 }
        )
      }

      await supabase.from('otp_store').delete().eq('phone', phone).eq('used', false)

      const otp = randomInt(1000, 10000).toString()

      const { error: insertError } = await supabase.from('otp_store').insert({
        phone,
        otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      if (insertError) {
        return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 })
      }

      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ success: true, otp })
      }
      return NextResponse.json({ success: true, message: 'OTP sent to your number' })
    }

    // ── Verify OTP (phone + otp) ─────────────────────────────────────────────
    const result = otpVerifySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { phone, otp } = result.data

    const rlVerify = rateLimiter.check(`otp-verify:${phone}`, 10, 15 * 60 * 1000)
    if (!rlVerify.ok) return rateLimitResponse(rlVerify.retryAfter!)

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

    await supabase.from('otp_store').update({ used: true }).eq('id', otpRecord.id)

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
    response.cookies.set(
      'customer_session',
      JSON.stringify({ id: customer.id, phone: customer.phone, customer_token: customer.customer_token }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      }
    )
    return response
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
