import { NextRequest, NextResponse } from 'next/server'
import { requireUserAndBusiness, adminClient } from '@/lib/auth'

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const head = headers.map(escapeCsv).join(',')
  const body = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
  return `${head}\n${body}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bizId = searchParams.get('bizId')

    if (!bizId) {
      return NextResponse.json({ error: 'bizId required' }, { status: 400 })
    }

    const business = await requireUserAndBusiness(bizId)
    if (business instanceof NextResponse) return business

    const { data: bcRows, error: bcError } = await adminClient
      .from('business_customers')
      .select('*, customer:customers(name, phone, whatsapp_optin, birthday_month, birthday_day)')
      .eq('business_id', bizId)
      .order('enrolled_at', { ascending: false })

    if (bcError) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const [{ data: stamps }, { data: claims }] = await Promise.all([
      adminClient
        .from('stamps')
        .select('customer_id, stamped_at')
        .eq('business_id', bizId)
        .order('stamped_at', { ascending: false }),
      adminClient
        .from('milestone_claims')
        .select('customer_id, milestone:milestones(badge)')
        .eq('business_id', bizId),
    ])

    const stampMap = new Map<string, string[]>()
    for (const s of stamps ?? []) {
      if (!stampMap.has(s.customer_id)) stampMap.set(s.customer_id, [])
      stampMap.get(s.customer_id)!.push(s.stamped_at as string)
    }

    const badgeMap = new Map<string, string[]>()
    for (const c of claims ?? []) {
      const badge = (c.milestone as { badge?: string } | null)?.badge
      if (!badge) continue
      if (!badgeMap.has(c.customer_id)) badgeMap.set(c.customer_id, [])
      badgeMap.get(c.customer_id)!.push(badge)
    }

    type BcRow = {
      customer_id: string
      enrolled_at: string
      cards_redeemed?: number
      customer: {
        name?: string
        phone: string
        whatsapp_optin: boolean
        birthday_month?: string
        birthday_day?: number
      }
    }

    const headers = [
      'name', 'phone', 'current_cycle_stamps', 'lifetime_visits',
      'last_visit_at', 'rewards_earned', 'rewards_redeemed',
      'whatsapp_optin', 'birthday_month', 'birthday_day',
      'enrolled_at', 'milestone_badges_earned',
    ]

    const rows = (bcRows as BcRow[] ?? []).map((bc) => {
      const c = bc.customer
      const customerStamps = stampMap.get(bc.customer_id) ?? []
      const total = customerStamps.length
      const cycleStamps = total % business.stamps_required
      const earned = Math.floor(total / business.stamps_required)
      const redeemed = bc.cards_redeemed ?? 0
      const lastVisit = customerStamps[0] ?? ''
      const badges = (badgeMap.get(bc.customer_id) ?? []).join(' | ')

      return [
        c.name ?? '',
        c.phone,
        cycleStamps,
        total,
        lastVisit,
        earned,
        redeemed,
        c.whatsapp_optin ? 'yes' : 'no',
        c.birthday_month ?? '',
        c.birthday_day ?? '',
        bc.enrolled_at,
        badges,
      ]
    })

    const csv = buildCsv(headers, rows)
    const date = new Date().toISOString().split('T')[0]
    const slug = business.slug || bizId.slice(0, 8)
    const filename = `${slug}-customers-${date}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
