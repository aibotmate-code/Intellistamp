import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const bizId = searchParams.get('bizId')

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 })
    }

    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_token', token)
      .single()

    if (custError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!bizId) {
      return NextResponse.json({ customer })
    }

    // Fetch card state for this business
    const { count: stampCount } = await supabase
      .from('stamps')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .eq('business_id', bizId)

    const { data: business } = await supabase
      .from('businesses')
      .select('stamps_required, reward, name, emoji, conflict_priority')
      .eq('id', bizId)
      .single()

    const total = stampCount ?? 0
    const stampsRequired = business?.stamps_required ?? 10
    const cardStamps = total % stampsRequired
    const cardsCompleted = Math.floor(total / stampsRequired)

    const { count: redeemedCount } = await supabase
      .from('stamps')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .eq('business_id', bizId)
      .eq('type', 'redeemed' as never)

    const cardsRedeemed = redeemedCount ?? 0

    return NextResponse.json({
      customer,
      card_state: {
        total_stamps: total,
        card_stamps: cardStamps,
        cards_completed: cardsCompleted,
        cards_redeemed: cardsRedeemed,
        redeemable: cardsCompleted > cardsRedeemed,
      },
      business,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
