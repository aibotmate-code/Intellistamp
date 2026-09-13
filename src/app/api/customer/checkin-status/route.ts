import { NextRequest, NextResponse } from 'next/server'
import { getPendingCheckinStatus } from '@/lib/server/pendingCheckins'
import { generateAccessGrant } from '@/lib/server/grant'

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

    // Query durable pending_checkins table in PostgreSQL with tenant boundary
    const result = await getPendingCheckinStatus(checkinId, businessId)

    if (result.status === 'not_found') {
      return NextResponse.json({ status: 'not_found' }, { status: 404 })
    }

    if (result.status === 'expired') {
      return NextResponse.json({ status: 'expired' })
    }

    if (result.status === 'rejected') {
      return NextResponse.json({ status: 'rejected' })
    }

    if (result.status === 'approved' && result.record) {
      const payload = result.record.result_payload || {}
      const cardStamps = typeof payload.card_stamps === 'number' ? payload.card_stamps : 1
      const totalStamps = typeof payload.total_stamps === 'number' ? payload.total_stamps : 1
      const cardsCompleted = typeof payload.cards_completed === 'number' ? payload.cards_completed : 0

      let accessGrant: string | undefined
      try {
        accessGrant = generateAccessGrant(result.record.customer_id, businessId)
      } catch {
        // non-critical
      }

      return NextResponse.json({
        status: 'approved',
        checkin_id: checkinId,
        card_state: payload.card_state || {
          total_stamps: totalStamps,
          card_stamps: cardStamps,
          cards_completed: cardsCompleted,
          can_stamp: false,
          cooldown_remaining_hours: 4,
          redeemable: Boolean(payload.redeemable),
        },
        reward_result: payload.reward_result || null,
        access_grant: accessGrant,
        stamped_at: result.record.approved_at || payload.stamped_at,
        new_stamp_index: typeof payload.card_stamps === 'number' ? Math.max(0, payload.card_stamps - 1) : 0,
      })
    }

    return NextResponse.json({ status: 'pending' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
