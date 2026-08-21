import { NextRequest, NextResponse } from 'next/server'
import { requireIntellicalAdmin } from '@/lib/auth'
import { getTenantActivity } from '@/lib/server/analytics'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const activity = await getTenantActivity(bizId)

    return NextResponse.json({
      success: true,
      activity,
    })
  } catch (err: unknown) {
    console.error('[Admin Business Activity Error]', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
