import { NextRequest, NextResponse } from 'next/server'
import { requireIntellicalAdmin } from '@/lib/auth'
import { getBusinessAnalytics, AnalyticsPeriod } from '@/lib/server/analytics'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const { searchParams } = new URL(req.url)
    const rawPeriod = searchParams.get('period') || '30d'
    const period: AnalyticsPeriod = (['7d', '30d', '90d'].includes(rawPeriod)
      ? rawPeriod
      : '30d') as AnalyticsPeriod

    const analytics = await getBusinessAnalytics(bizId, period)

    return NextResponse.json({
      success: true,
      analytics,
    })
  } catch (err: unknown) {
    console.error('[Admin Business Analytics Error]', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Business not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
