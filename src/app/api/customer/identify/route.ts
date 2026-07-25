import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimiter, rateLimitResponse } from '@/lib/rateLimit'

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  name: z.string().min(1).max(100).optional(),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimiter.check(`identify:${ip}`, 10, 15 * 60 * 1000)
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

    const { phone, name } = result.data

    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ customer: existing, isNew: false })
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ phone, name: name ?? null })
      .select()
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ customer, isNew: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
