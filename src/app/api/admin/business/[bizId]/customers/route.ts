import { NextRequest, NextResponse } from 'next/server'
import { requireIntellicalAdmin } from '@/lib/auth'
import { getTenantCustomers } from '@/lib/server/analytics'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const customers = await getTenantCustomers(bizId)

    return NextResponse.json({
      success: true,
      customers,
    })
  } catch (err: unknown) {
    console.error('[Admin Business Customers Error]', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
