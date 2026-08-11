import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { customerProfileSchema } from '@/lib/validators'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const result = customerProfileSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { customer_id, name, birthday_month, birthday_day, whatsapp_optin } = result.data

    const { data: customer, error } = await supabase
      .from('customers')
      .update({ name, birthday_month, birthday_day, whatsapp_optin })
      .eq('id', customer_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, customer })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const phone = searchParams.get('phone')

    if (!customerId && !phone) {
      return NextResponse.json({ error: 'customerId or phone required' }, { status: 400 })
    }

    let query = supabase.from('customers').select('*')
    if (customerId) {
      query = query.eq('id', customerId)
    } else {
      query = query.eq('phone', phone!)
    }

    const { data: customer, error } = await query.single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get enrollments with stamps
    const { data: enrollments } = await supabase
      .from('business_customers')
      .select('*, business:businesses(*, branding:business_branding(*))')
      .eq('customer_id', customer.id)
      .order('enrolled_at', { ascending: false })

    // Get all stamps for customer
    const { data: allStamps } = await supabase
      .from('stamps')
      .select('*')
      .eq('customer_id', customer.id)
      .order('stamped_at', { ascending: false })

    const stampsByBiz = new Map<string, typeof allStamps>()
    for (const stamp of allStamps ?? []) {
      if (!stampsByBiz.has(stamp.business_id)) {
        stampsByBiz.set(stamp.business_id, [])
      }
      stampsByBiz.get(stamp.business_id)!.push(stamp)
    }

    const cards = (enrollments ?? []).map((bc) => {
      const bizStamps = stampsByBiz.get(bc.business_id) ?? []
      const total = bizStamps.length
      const business = bc.business as {
        stamps_required: number
        branding?: { logo_path?: string | null } | { logo_path?: string | null }[] | null
      }
      const stampsRequired = business.stamps_required
      const cardStamps = total % stampsRequired
      const cardsCompleted = Math.floor(total / stampsRequired)
      const cardsRedeemed = (bc as { cards_redeemed?: number }).cards_redeemed ?? 0

      // Extract and map branding
      const rawBranding = Array.isArray(business.branding) ? business.branding[0] : business.branding
      let mappedBranding = null
      if (rawBranding) {
        let logo_url = null
        if (rawBranding.logo_path) {
          const { data } = supabase.storage.from('branding').getPublicUrl(rawBranding.logo_path)
          logo_url = data?.publicUrl || null
        }
        mappedBranding = {
          ...rawBranding,
          logo_url
        }
      }

      return {
        ...bc,
        business: {
          ...business,
          branding: mappedBranding
        },
        total_stamps: total,
        card_stamps: cardStamps,
        cards_completed: cardsCompleted,
        cards_redeemed: cardsRedeemed,
      }
    })

    return NextResponse.json({ customer, cards })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
