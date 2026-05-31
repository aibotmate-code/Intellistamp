import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stampRedeemSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const result = stampRedeemSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { customer_id, business_id } = result.data

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('stamps_required, reward')
      .eq('id', business_id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: stamps } = await supabase
      .from('stamps')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('business_id', business_id)

    const total = stamps?.length ?? 0

    // Get current cards_redeemed
    const { data: bc } = await supabase
      .from('business_customers')
      .select('cards_redeemed')
      .eq('business_id', business_id)
      .eq('customer_id', customer_id)
      .single()

    const cardsRedeemed = (bc as { cards_redeemed?: number } | null)?.cards_redeemed ?? 0
    const availableCards = Math.floor(total / business.stamps_required) - cardsRedeemed

    if (availableCards <= 0) {
      return NextResponse.json({ error: 'No completed card to redeem' }, { status: 400 })
    }

    await supabase
      .from('business_customers')
      .update({ cards_redeemed: cardsRedeemed + 1 })
      .eq('business_id', business_id)
      .eq('customer_id', customer_id)

    const code = Math.random().toString(36).toUpperCase().slice(2, 8)

    return NextResponse.json({
      success: true,
      code,
      reward: business.reward,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
