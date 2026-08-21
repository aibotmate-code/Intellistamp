import { NextRequest, NextResponse } from 'next/server'
import { requireIntellicalAdmin, adminClient } from '@/lib/auth'
import { getTenantActivity } from '@/lib/server/analytics'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const { data: business } = await adminClient
      .from('businesses')
      .select('slug, name')
      .eq('id', bizId)
      .single()

    const activity = await getTenantActivity(bizId)

    const headers = [
      'Date/Time',
      'Event Type',
      'Customer',
      'Event Description',
      'Actor/Source',
    ]

    const rows = activity.map((ev) => [
      ev.timestamp ? new Date(ev.timestamp).toISOString() : '',
      ev.type,
      ev.customerName || ev.customerPhone || 'Guest Customer',
      ev.description,
      ev.actor || 'System',
    ])

    const csvContent = buildCsv(headers, rows)
    const dateStr = new Date().toISOString().split('T')[0]
    const fileSlug = business?.slug || bizId.slice(0, 8)
    const filename = `${fileSlug}-activity-${dateStr}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    console.error('[Admin Export Activity Error]', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
