import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
  milestones: z.array(milestoneSchema),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = saveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, conflict_priority, stamps_required, reward, milestones } = result.data

    // Delete existing milestones
    const { error: deleteError } = await supabase
      .from('milestones')
      .delete()
      .eq('business_id', business_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to update milestones.' }, { status: 500 })
    }

    // Insert new milestones
    let savedMilestones: unknown[] = []
    if (milestones.length > 0) {
      const rows = milestones.map((m) => ({ ...m, business_id }))
      const { data: inserted, error: insertError } = await supabase
        .from('milestones')
        .insert(rows)
        .select()
      if (insertError) {
        return NextResponse.json({ error: 'Failed to save milestones.' }, { status: 500 })
      }
      savedMilestones = inserted ?? []
    }

    // Update business
    const bizUpdates: Record<string, unknown> = { conflict_priority }
    if (stamps_required !== undefined) bizUpdates.stamps_required = stamps_required
    if (reward !== undefined) bizUpdates.reward = reward

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .update(bizUpdates)
      .eq('id', business_id)
      .select()
      .single()

    if (bizError) {
      return NextResponse.json({ error: 'Failed to update business settings.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, milestones: savedMilestones, business })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
