import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAccessGrant } from '@/lib/server/grant'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bizId = searchParams.get('bizId')

    if (!bizId) {
      return NextResponse.json({ error: 'Missing business ID' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const grant = cookieStore.get(`card_access_${bizId}`)?.value

    if (!grant) {
      return NextResponse.json({ error: 'Access denied or expired' }, { status: 401 })
    }

    const customerId = validateAccessGrant(grant, bizId)
    if (!customerId) {
      return NextResponse.json({ error: 'Invalid or expired grant' }, { status: 401 })
    }

    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('id, name, phone, created_at') // Crucially excludes customer_token
      .eq('id', customerId)
      .single()

    if (custError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Mask phone
    const maskedPhone = customer.phone ? `+91 ******${customer.phone.slice(-4)}` : null
    const safeCustomer = {
      ...customer,
      phone: maskedPhone
    }

    // Fetch card state
    const { count: stampCount } = await supabase
      .from('stamps')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .eq('business_id', bizId)

    const { data: business } = await supabase
      .from('businesses')
      .select('stamps_required, reward, name, emoji, conflict_priority, branding:business_branding(*)')
      .eq('id', bizId)
      .single()

    const total = stampCount ?? 0
    const stampsRequired = business?.stamps_required ?? 10
    const cardStamps = total % stampsRequired
    const cardsCompleted = Math.floor(total / stampsRequired)
    const stampComplete = cardStamps === 0 && total > 0

    const { data: bcRow } = await supabase
      .from('business_customers')
      .select('cards_redeemed')
      .eq('customer_id', customer.id)
      .eq('business_id', bizId)
      .single()

    const cardsRedeemed = (bcRow as { cards_redeemed?: number } | null)?.cards_redeemed ?? 0

    let businessWithBranding = null
    if (business) {
      const rawBranding = (business as { branding?: { logo_path?: string | null } | null }).branding
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
      businessWithBranding = {
        ...business,
        branding: mappedBranding
      }
    }

    const res = NextResponse.json({
      customer: safeCustomer,
      card_state: {
        total_stamps: total,
        card_stamps: stampComplete ? stampsRequired : cardStamps,
        cards_completed: cardsCompleted,
        cards_redeemed: cardsRedeemed,
        redeemable: cardsCompleted > cardsRedeemed,
      },
      business: businessWithBranding,
    })

    // Set no-store headers
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.headers.set('Referrer-Policy', 'no-referrer')
    return res
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
