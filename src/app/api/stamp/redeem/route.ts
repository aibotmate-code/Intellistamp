import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { adminClient } from '@/lib/auth'
import { stampRedeemSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = stampRedeemSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { customer_id, business_id } = result.data

    const [
      { data: business, error: bizError },
      { data: bc },
    ] = await Promise.all([
      adminClient
        .from('businesses')
        .select('stamps_required, reward')
        .eq('id', business_id)
        .single(),
      adminClient
        .from('business_customers')
        .select('cards_redeemed')
        .eq('business_id', business_id)
        .eq('customer_id', customer_id)
        .single(),
    ])

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { count: stampCount } = await adminClient
      .from('stamps')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer_id)
      .eq('business_id', business_id)

    const total = stampCount ?? 0
    const cardsRedeemed = (bc as { cards_redeemed?: number } | null)?.cards_redeemed ?? 0
    const availableCards = Math.floor(total / business.stamps_required) - cardsRedeemed

    if (availableCards <= 0) {
      return NextResponse.json({ error: 'No completed card to redeem' }, { status: 400 })
    }

    // Optimistic-lock the increment: WHERE cards_redeemed = <current value>
    // so concurrent requests cannot double-increment the counter.
    const { data: updated } = await adminClient
      .from('business_customers')
      .update({ cards_redeemed: cardsRedeemed + 1 })
      .eq('business_id', business_id)
      .eq('customer_id', customer_id)
      .eq('cards_redeemed', cardsRedeemed)
      .select('cards_redeemed')

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Redemption conflict. Please try again.' }, { status: 409 })
    }

    // 6-character cryptographically random hex code for staff to verify
    const code = randomBytes(3).toString('hex').toUpperCase()

    return NextResponse.json({
      success: true,
      code,
      reward: business.reward,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
