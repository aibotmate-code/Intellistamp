import { NextRequest, NextResponse } from 'next/server'
import { requireUserAndBusiness, adminClient } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  id: z.string().uuid(),
  dynamic_qr_enabled: z.boolean().optional(),
  staff_pin_enabled: z.boolean().optional(),
  whatsapp_enabled: z.boolean().optional(),
  gmb_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
})

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { id, ...updates } = result.data

    const business = await requireUserAndBusiness(id)
    if (business instanceof NextResponse) return business

    const { data: updated, error } = await adminClient
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select(
        'id, name, slug, emoji, category, stamps_required, reward, gmb_link, ' +
        'dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled, plan, conflict_priority'
      )
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
    }

    return NextResponse.json({ success: true, business: updated })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
