import { NextRequest, NextResponse } from 'next/server'
import { requireUserAndBusiness, adminClient } from '@/lib/auth'
import { campaignSendSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = campaignSendSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, message, audience } = result.data

    const business = await requireUserAndBusiness(business_id)
    if (business instanceof NextResponse) return business

    // Fetch all opted-in customers for this business
    const { data: bc } = await adminClient
      .from('business_customers')
      .select('customer_id, customer:customers(phone, name, whatsapp_optin)')
      .eq('business_id', business_id)

    let customers = (bc ?? []).filter((row) => {
      const c = row.customer as unknown as { whatsapp_optin: boolean } | null
      return c?.whatsapp_optin
    })

    // Apply audience filter
    if (audience === 'near_reward') {
      const { data: stampRows } = await adminClient
        .from('stamps')
        .select('customer_id')
        .eq('business_id', business_id)

      const countMap = new Map<string, number>()
      for (const s of stampRows ?? []) {
        countMap.set(s.customer_id, (countMap.get(s.customer_id) ?? 0) + 1)
      }

      customers = customers.filter((row) => {
        const total = countMap.get(row.customer_id as string) ?? 0
        const remaining = business.stamps_required - (total % business.stamps_required)
        return remaining <= 2 && remaining > 0
      })
    } else if (audience === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentStamps } = await adminClient
        .from('stamps')
        .select('customer_id')
        .eq('business_id', business_id)
        .gt('stamped_at', thirtyDaysAgo)

      const activeIds = new Set((recentStamps ?? []).map((s) => s.customer_id))
      customers = customers.filter((row) => !activeIds.has(row.customer_id as string))
    }

    if (customers.length === 0) {
      return NextResponse.json({ error: 'No opted-in customers for selected audience' }, { status: 400 })
    }

    // Record campaign — delivered starts at 0 (no delivery pipeline yet)
    const { data: campaign, error } = await adminClient
      .from('campaigns')
      .insert({
        business_id,
        message,
        audience,
        total_sent: customers.length,
        delivered: 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to record campaign.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      campaign,
      total_sent: customers.length,
      message: 'Campaign draft recorded.',
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
