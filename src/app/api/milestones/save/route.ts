import { NextRequest, NextResponse } from 'next/server'
import { requireUserAndBusiness, adminClient } from '@/lib/auth'
import { z } from 'zod'

const milestoneSchema = z.object({
  visit_number: z.number().int().positive(),
  badge: z.string().min(1),
  reward: z.string().min(1),
  is_active: z.boolean().default(true),
})

const saveSchema = z.object({
  business_id: z.string().uuid(),
  conflict_priority: z.enum(['stamp', 'milestone']),
  stamps_required: z.number().int().min(3).max(20).optional(),
  reward: z.string().min(1).optional(),
  hide_reward_details: z.boolean().optional(),
  milestones: z.array(milestoneSchema),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = saveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, conflict_priority, stamps_required, reward, hide_reward_details, milestones } = result.data

    const business = await requireUserAndBusiness(business_id)
    if (business instanceof NextResponse) return business

    const { error: deleteError } = await adminClient
      .from('milestones')
      .delete()
      .eq('business_id', business_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to update milestones.' }, { status: 500 })
    }

    let savedMilestones: unknown[] = []
    if (milestones.length > 0) {
      const rows = milestones.map((m) => ({ ...m, business_id }))
      const { data: inserted, error: insertError } = await adminClient
        .from('milestones')
        .insert(rows)
        .select()
      if (insertError) {
        return NextResponse.json({ error: 'Failed to save milestones.' }, { status: 500 })
      }
      savedMilestones = inserted ?? []
    }

    const bizUpdates: Record<string, unknown> = { conflict_priority }
    if (stamps_required !== undefined) bizUpdates.stamps_required = stamps_required
    if (reward !== undefined) bizUpdates.reward = reward
    if (hide_reward_details !== undefined) bizUpdates.hide_reward_details = hide_reward_details

    const { data: updatedBiz, error: bizError } = await adminClient
      .from('businesses')
      .update(bizUpdates)
      .eq('id', business_id)
      .select(
        'id, name, slug, emoji, category, stamps_required, reward, gmb_link, ' +
        'dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled, plan, conflict_priority, hide_reward_details'
      )
      .single()

    if (bizError) {
      return NextResponse.json({ error: 'Failed to update business settings.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, milestones: savedMilestones, business: updatedBiz })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
