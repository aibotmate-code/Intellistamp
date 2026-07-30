import { NextRequest, NextResponse } from 'next/server'
import { requireUser, adminClient } from '@/lib/auth'

const BUSINESS_FIELDS =
  'id, name, slug, emoji, category, stamps_required, reward, gmb_link, dynamic_qr_enabled, staff_pin_enabled, staff_pin, staff_pin_hash, whatsapp_enabled, plan, conflict_priority, owner_id, owner_phone, created_at'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (user instanceof NextResponse) return user

    const { searchParams } = new URL(req.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
    }

    // IDOR guard: the ownerId param must match the authenticated session
    if (ownerId !== user.id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: businesses, error: bizError } = await adminClient
      .from('businesses')
      .select(BUSINESS_FIELDS)
      .eq('owner_id', ownerId)

    if (bizError || !businesses || businesses.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const business = businesses[0] as unknown as typeof businesses[number] & { id: string; stamps_required: number }

    const [stampsResult, customersResult] = await Promise.all([
      adminClient.from('stamps').select('id', { count: 'exact' }).eq('business_id', business.id),
      adminClient.from('business_customers').select('id', { count: 'exact' }).eq('business_id', business.id),
    ])

    const totalStamps = stampsResult.count ?? 0
    const totalCustomers = customersResult.count ?? 0

    const { data: bcData, error: bcError } = await adminClient
      .from('business_customers')
      .select('*, customer:customers(id, name, phone, whatsapp_optin, birthday_month, birthday_day, customer_token, created_at)')
      .eq('business_id', business.id)
      .order('enrolled_at', { ascending: false })

    if (bcError) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const { data: allStamps } = await adminClient
      .from('stamps')
      .select('id, customer_id, stamped_at, type')
      .eq('business_id', business.id)
      .order('stamped_at', { ascending: false })

    const stampsByCustomer = new Map<string, typeof allStamps>()
    for (const stamp of allStamps ?? []) {
      if (!stampsByCustomer.has(stamp.customer_id)) {
        stampsByCustomer.set(stamp.customer_id, [])
      }
      stampsByCustomer.get(stamp.customer_id)!.push(stamp)
    }

    const rewardsRedeemed = (bcData ?? []).reduce(
      (sum, bc) => sum + ((bc as { cards_redeemed?: number }).cards_redeemed ?? 0),
      0
    )

    const customers = (bcData ?? []).map((bc) => {
      const customerStamps = stampsByCustomer.get(bc.customer_id) ?? []
      const total = customerStamps.length
      const cardStamps = total % (business.stamps_required as number)
      const lastStamp = customerStamps[0]

      let canStamp = true
      let cooldownHours: number | undefined
      if (lastStamp) {
        const diffMs = Date.now() - new Date(lastStamp.stamped_at).getTime()
        const fourHours = 4 * 60 * 60 * 1000
        if (diffMs < fourHours) {
          canStamp = false
          cooldownHours = Math.ceil((fourHours - diffMs) / (60 * 60 * 1000))
        }
      }

      return {
        ...bc,
        total_stamps: total,
        card_stamps: cardStamps,
        last_stamp: lastStamp?.stamped_at,
        can_stamp: canStamp,
        cooldown_hours: cooldownHours,
      }
    })

    return NextResponse.json({
      business,
      stats: {
        total_customers: totalCustomers,
        total_stamps: totalStamps,
        rewards_redeemed: rewardsRedeemed,
      },
      customers,
      allBusinesses: businesses,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
