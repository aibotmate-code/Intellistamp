import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { phoneSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const result = phoneSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { phone } = result.data

    // Rate limit: check OTPs sent in last 60 seconds
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

    // Delete old unused OTPs for this phone
    await supabase
      .from('otp_store')
      .delete()
      .eq('phone', phone)
      .eq('used', false)

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString()

    // Insert OTP
    const { error: insertError } = await supabase.from('otp_store').insert({
      phone,
      otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 })
    }

    // Development: return OTP in response
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ success: true, otp })
    }

    return NextResponse.json({ success: true, message: 'OTP sent to your number' })
  } catch {
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 })
  }
}
