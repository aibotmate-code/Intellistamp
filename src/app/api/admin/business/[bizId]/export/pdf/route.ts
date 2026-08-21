import { NextRequest, NextResponse } from 'next/server'
import { requireIntellicalAdmin, adminClient } from '@/lib/auth'
import { generateBusinessReportPdf } from '@/lib/server/pdfReport'
import { AnalyticsPeriod } from '@/lib/server/analytics'

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

    const { data: business } = await adminClient
      .from('businesses')
      .select('slug, name')
      .eq('id', bizId)
      .single()

    const pdfBuffer = await generateBusinessReportPdf(bizId, period)
    const dateStr = new Date().toISOString().split('T')[0]
    const fileSlug = business?.slug || bizId.slice(0, 8)
    const filename = `${fileSlug}-performance-report-${period}-${dateStr}.pdf`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    console.error('[Admin PDF Report Export Error]', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Business not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
