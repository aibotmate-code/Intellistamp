import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { MilestoneWithStatus } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { customerId: string; bizId: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { customerId, bizId } = params

    // Get active milestones for this business
    const { data: milestones, error: milestoneError } = await supabase
      .from('milestones')
      .select('*')
      .eq('business_id', bizId)
      .eq('is_active', true)
      .order('visit_number', { ascending: true })

    if (milestoneError) {
      return NextResponse.json({ error: 'Failed to fetch milestones.' }, { status: 500 })
    }

    if (!milestones || milestones.length === 0) {
      return NextResponse.json({ milestones: [] })
    }

    // Count total stamps (visits) for this customer at this business
    const { count, error: stampError } = await supabase
      .from('stamps')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('business_id', bizId)

    if (stampError) {
      return NextResponse.json({ error: 'Failed to fetch stamp count.' }, { status: 500 })
    }

    const totalVisits = count ?? 0

    // Get already-claimed milestones for this customer
    const { data: claims, error: claimError } = await supabase
      .from('milestone_claims')
      .select('milestone_id')
      .eq('customer_id', customerId)
      .eq('business_id', bizId)

    if (claimError) {
      return NextResponse.json({ error: 'Failed to fetch milestone claims.' }, { status: 500 })
    }

    const claimedIds = new Set((claims ?? []).map((c) => c.milestone_id))

    const result: MilestoneWithStatus[] = milestones.map((m) => ({
      ...m,
      earned: totalVisits >= m.visit_number && claimedIds.has(m.id),
      visits_remaining: Math.max(0, m.visit_number - totalVisits),
    }))

    return NextResponse.json({ milestones: result })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
