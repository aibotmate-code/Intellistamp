import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { stampIssueSchema } from '@/lib/validators'
import { validateToken } from '@/lib/token'
import type { RewardResult } from '@/types'

async function claimMilestone(
  supabase: SupabaseClient,
  customerId: string,
  businessId: string,
  milestoneId: string
): Promise<void> {
  await supabase.from('milestone_claims').insert({
    customer_id: customerId,
    business_id: businessId,
    milestone_id: milestoneId,
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = stampIssueSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { customer_id, business_id, token, staff_pin, type } = result.data

    // Business fetch and the cooldown lookup are independent of each other — run in parallel
    const [
      { data: business, error: bizError },
      { data: recentStamp },
    ] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', business_id).single(),
      supabase
        .from('stamps')
        .select('stamped_at')
        .eq('customer_id', customer_id)
        .eq('business_id', business_id)
        .order('stamped_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Validate token — 401 because the token IS the authorization credential
    if (business.dynamic_qr_enabled) {
      if (!validateToken(business_id, token)) {
        return NextResponse.json({ error: 'Invalid or expired token. Please scan the QR again.' }, { status: 401 })
      }
    }

    // Validate staff PIN if required
    if (business.staff_pin_enabled) {
      if (!staff_pin || staff_pin !== business.staff_pin) {
        return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 400 })
      }
    }

    // Check cooldown
    if (recentStamp) {
      const diffMs = Date.now() - new Date(recentStamp.stamped_at).getTime()
      const fourHours = 4 * 60 * 60 * 1000
      if (diffMs < fourHours) {
        const hoursLeft = Math.ceil((fourHours - diffMs) / (60 * 60 * 1000))
        return NextResponse.json(
          { error: `You already stamped recently. Next stamp available in ${hoursLeft}h.`, cooldown_hours: hoursLeft },
          { status: 429 }
        )
      }
    }

    // Ensure enrolled
    await supabase
      .from('business_customers')
      .upsert({ business_id, customer_id }, { onConflict: 'business_id,customer_id' })

    // Insert stamp — stamp_token stored for dynamic QR; unique per (business,customer,token) blocks replay
    const { data: stamp, error: stampError } = await supabase
      .from('stamps')
      .insert({
        customer_id,
        business_id,
        type: type ?? 'regular',
        ...(business.dynamic_qr_enabled && token ? { stamp_token: token } : {}),
      })
      .select()
      .single()

    if (stampError) {
      if (stampError.code === '23505') {
        return NextResponse.json(
          { error: 'Token already used. Please scan the QR code again.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to issue stamp. Please try again.' }, { status: 500 })
    }

    // Get updated stamp count
    const { count: stampCount } = await supabase
      .from('stamps')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer_id)
      .eq('business_id', business_id)

    const total = stampCount ?? 0
    const cardStamps = total % business.stamps_required
    const cardsCompleted = Math.floor(total / business.stamps_required)
    const stampComplete = cardStamps === 0 && total > 0

    // If bonus_review, mark review_claimed
    if (type === 'bonus_review') {
      await supabase
        .from('business_customers')
        .update({ review_claimed: true })
        .eq('business_id', business_id)
        .eq('customer_id', customer_id)
    }

    // --- Milestone resolution ---

    // Find the lowest-visit unclaimed milestone at or below this visit count.
    // Using lte (not eq) means deferred milestones from a previous conflict also fire here.
    const [{ data: eligibleMilestones }, { data: priorClaims }] = await Promise.all([
      supabase
        .from('milestones')
        .select('*')
        .eq('business_id', business_id)
        .lte('visit_number', total)
        .eq('is_active', true)
        .order('visit_number', { ascending: true }),
      supabase
        .from('milestone_claims')
        .select('milestone_id')
        .eq('customer_id', customer_id)
        .eq('business_id', business_id),
    ])

    const claimedMilestoneIds = new Set((priorClaims ?? []).map((c) => c.milestone_id))
    const unclaimed_milestone =
      (eligibleMilestones ?? []).find((m) => !claimedMilestoneIds.has(m.id)) ?? null

    let reward_result: RewardResult | null = null

    if (stampComplete && unclaimed_milestone) {
      // Both triggered — resolve via conflict_priority
      if (business.conflict_priority === 'stamp') {
        reward_result = {
          type: 'stamp',
          reward: business.reward,
          deferred_milestone: unclaimed_milestone,
        }
        // Milestone is NOT claimed yet; customer redeems it separately later
      } else {
        // priority === 'milestone'
        await claimMilestone(supabase, customer_id, business_id, unclaimed_milestone.id)
        reward_result = {
          type: 'milestone',
          milestone: unclaimed_milestone,
          deferred_stamp: true,
        }
      }
    } else if (stampComplete) {
      reward_result = {
        type: 'stamp',
        reward: business.reward,
      }
    } else if (unclaimed_milestone) {
      await claimMilestone(supabase, customer_id, business_id, unclaimed_milestone.id)
      reward_result = {
        type: 'milestone',
        milestone: unclaimed_milestone,
      }
    }

    return NextResponse.json({
      success: true,
      stamp,
      card_state: {
        total_stamps: total,
        card_stamps: stampComplete ? business.stamps_required : cardStamps,
        cards_completed: cardsCompleted,
        can_stamp: false,
        cooldown_remaining_hours: 4,
        redeemable: stampComplete,
      },
      reward_result,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
