import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { businessCreateSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const result = businessCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = result.data

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
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create business. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, business })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
