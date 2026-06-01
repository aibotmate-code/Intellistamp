import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const milestoneSchema = z.object({
  visit_number: z.number().int().positive(),
  badge: z.string().min(1),
  reward: z.string().min(1),
  is_active: z.boolean(),
})

const saveSchema = z.object({
  business_id: z.string().uuid(),
  conflict_priority: z.enum(['stamp', 'milestone']),
  milestones: z.array(milestoneSchema),
})

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const result = saveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, conflict_priority, milestones } = result.data

    // Delete existing milestones for this business
    const { error: deleteError } = await supabase
      .from('milestones')
      .delete()
      .eq('business_id', business_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to update milestones.' }, { status: 500 })
    }

    // Insert new milestones if any
    if (milestones.length > 0) {
      const rows = milestones.map((m) => ({ ...m, business_id }))
      const { error: insertError } = await supabase.from('milestones').insert(rows)
      if (insertError) {
        return NextResponse.json({ error: 'Failed to save milestones.' }, { status: 500 })
      }
    }

    // Update business conflict_priority
    const { error: bizError } = await supabase
      .from('businesses')
      .update({ conflict_priority })
      .eq('id', business_id)

    if (bizError) {
      return NextResponse.json({ error: 'Failed to update conflict priority.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
