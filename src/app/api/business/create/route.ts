import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { businessCreateSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  // Cause 2: guard against missing env var before any DB call
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Cause 3: confirmed — always uses service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const body = await req.json()

    // Cause 4: normalise +91 prefix before validation so both formats are accepted
    if (typeof body.owner_phone === 'string') {
      body.owner_phone = body.owner_phone.replace(/^\+91/, '')
    }

    const result = businessCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = result.data

    // Cause 1: generate slug BEFORE insert so the row never lands with slug=''
    // which would immediately break the UNIQUE constraint on any second business.
    let slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (!slug) slug = 'business'

    // Cause 5: conflict check before insert, not after
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`
    }

    // Single insert — slug is included, no separate UPDATE step needed
    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        name: data.name,
        category: data.category,
        emoji: data.emoji,
        stamps_required: data.stamps_required,
        reward: data.reward,
        staff_pin: data.staff_pin,
        gmb_link: data.gmb_link || null,
        dynamic_qr_enabled: data.dynamic_qr_enabled,
        staff_pin_enabled: data.staff_pin_enabled,
        owner_phone: data.owner_phone,
        whatsapp_enabled: false,
        plan: 'free',
        slug,
      })
      .select()
      .single()

    if (error || !business) {
      console.error('Business insert error:', error)
      return NextResponse.json({
        error: 'Failed to create business. Please try again.',
        _debug: error?.message ?? 'no business returned',
        _code: error?.code,
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, business })
  } catch (err) {
    console.error('Business create unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
