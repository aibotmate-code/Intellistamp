import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPendingCheckin, approvePendingCheckin } from '@/lib/server/pendingCheckins'
import { generateAccessGrant } from '@/lib/server/grant'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const checkinId = searchParams.get('checkinId')
    const businessId = searchParams.get('businessId')

    if (!checkinId || !businessId) {
      return NextResponse.json(
        { error: 'checkinId and businessId required' },
        { status: 400 }
      )
    }

    // 1. Check in-memory store (with tenant boundary enforcement)
    const pending = getPendingCheckin(checkinId, businessId)
    if (!pending) {
      return NextResponse.json({ status: 'expired' })
    }

    if (pending.status === 'approved' && pending.result) {
      return NextResponse.json({
        status: 'approved',
        ...pending.result,
      })
    }

    // 2. Database verification: check if a stamp was issued for this customer
    // at or after the check-in creation timestamp (handles counter stamp via Kiosk)
    const checkinIsoDate = new Date(pending.created_at - 1000).toISOString()

    const { data: recentStamps } = await supabase
      .from('stamps')
      .select('id, stamped_at, type')
      .eq('business_id', businessId)
      .eq('customer_id', pending.customer_id)
      .gte('stamped_at', checkinIsoDate)
      .order('stamped_at', { ascending: false })
      .limit(1)

    if (recentStamps && recentStamps.length > 0) {
      // Calculate updated card state
      const [
        { count: totalStampsCount },
        { data: business },
      ] = await Promise.all([
        supabase
          .from('stamps')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('customer_id', pending.customer_id),
        supabase
          .from('businesses')
          .select('stamps_required, reward')
          .eq('id', businessId)
          .single(),
      ])

      const total = totalStampsCount || 1
      const stampsReq = business?.stamps_required || 6
      const cardStamps = total % stampsReq
      const cardsCompleted = Math.floor(total / stampsReq)
      const stampComplete = cardStamps === 0 && total > 0

      const card_state = {
        total_stamps: total,
        card_stamps: cardStamps === 0 && total > 0 ? stampsReq : cardStamps,
        cards_completed: cardsCompleted,
        can_stamp: false,
        cooldown_remaining_hours: 4,
        redeemable: stampComplete,
      }

      let accessGrant = undefined
      try {
        accessGrant = generateAccessGrant(pending.customer_id, businessId)
      } catch {
        // non-critical
      }

      const result = {
        card_state,
        reward_result: stampComplete && business?.reward ? { type: 'stamp' as const, reward: business.reward } : null,
        access_grant: accessGrant,
        stamped_at: recentStamps[0].stamped_at,
        new_stamp_index: card_state.card_stamps - 1,
      }

      approvePendingCheckin(checkinId, businessId, result)

      return NextResponse.json({
        status: 'approved',
        ...result,
      })
    }

    return NextResponse.json({ status: 'pending' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
