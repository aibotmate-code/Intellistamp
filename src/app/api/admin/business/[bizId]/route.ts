import { NextRequest, NextResponse } from 'next/server'
import { requireIntellicalAdmin, adminClient } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bizId: string }> }) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const body = await req.json()
    const { approval_status, plan, plan_expires_at } = body

    const updates: any = {}
    
    if (approval_status !== undefined) {
      if (!['pending', 'approved', 'suspended', 'rejected'].includes(approval_status)) {
        return NextResponse.json({ error: 'Invalid approval status' }, { status: 400 })
      }
      updates.approval_status = approval_status
    }

    if (plan !== undefined) {
      if (!['free', 'pro'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }
      updates.plan = plan
    }

    if (plan_expires_at !== undefined) {
      if (plan_expires_at === null || plan_expires_at === '') {
        updates.plan_expires_at = null
      } else {
        const date = new Date(plan_expires_at)
        if (isNaN(date.getTime())) {
          return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 })
        }
        updates.plan_expires_at = date.toISOString()
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await adminClient
      .from('businesses')
      .update(updates)
      .eq('id', bizId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, business: updated })
  } catch (err) {
    console.error('[Admin Update Error]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
