import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({
  business_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  pin: z.string().length(4, 'PIN must be 4 digits'),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, customer_id, pin } = result.data

    const { data: business } = await supabase
      .from('businesses')
      .select('staff_pin, stamps_required, gmb_link')
      .eq('id', business_id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (business.staff_pin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    if (!business.gmb_link) {
      return NextResponse.json({ error: 'No GMB link configured' }, { status: 400 })
    }

    // Check if review already claimed
    const { data: bc } = await supabase
      .from('business_customers')
      .select('review_claimed')
      .eq('business_id', business_id)
      .eq('customer_id', customer_id)
      .maybeSingle()

    if (bc?.review_claimed) {
      return NextResponse.json({ error: 'Review bonus already claimed' }, { status: 409 })
    }

    // Issue bonus stamp
    await supabase.from('stamps').insert({ customer_id, business_id, type: 'bonus_review' })

    // Mark review_claimed
    await supabase
      .from('business_customers')
      .update({ review_claimed: true })
      .eq('business_id', business_id)
      .eq('customer_id', customer_id)

    // Return updated stamp count
    const { count } = await supabase
      .from('stamps')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer_id)
      .eq('business_id', business_id)

    const total = count ?? 0
    const cardStamps = total % business.stamps_required
    const stampComplete = cardStamps === 0 && total > 0

    return NextResponse.json({
      success: true,
      card_state: {
        total_stamps: total,
        card_stamps: stampComplete ? business.stamps_required : cardStamps,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
