import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { searchParams } = new URL(req.url)
    const bizId = searchParams.get('bizId')
    const ownerPhone = searchParams.get('ownerPhone')
    const slug = searchParams.get('slug')
    const ownerId = searchParams.get('ownerId')

    if (!bizId && !ownerPhone && !slug && !ownerId) {
      return NextResponse.json({ error: 'bizId, ownerPhone, ownerId, or slug required' }, { status: 400 })
    }

    let query = supabase.from('businesses').select('*')
    if (bizId) {
      query = query.eq('id', bizId)
    } else if (slug) {
      query = query.eq('slug', slug)
    } else if (ownerId) {
      query = query.eq('owner_id', ownerId)
    } else {
      query = query.eq('owner_phone', ownerPhone!)
    }

    const { data: businesses, error: bizError } = await query

    if (bizError || !businesses || businesses.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const business = businesses[0]

    // Get stats
    const [stampsResult, customersResult] = await Promise.all([
      supabase.from('stamps').select('id', { count: 'exact' }).eq('business_id', business.id),
      supabase.from('business_customers').select('id', { count: 'exact' }).eq('business_id', business.id),
    ])

    const totalStamps = stampsResult.count ?? 0
    const totalCustomers = customersResult.count ?? 0

    // Get customers with stamp info
    const { data: bcData, error: bcError } = await supabase
      .from('business_customers')
      .select('*, customer:customers(*)')
      .eq('business_id', business.id)
      .order('enrolled_at', { ascending: false })

    if (bcError) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    // Get all stamps for this business (batch)
    const { data: allStamps } = await supabase
      .from('stamps')
      .select('*')
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
      const cardStamps = total % business.stamps_required
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
