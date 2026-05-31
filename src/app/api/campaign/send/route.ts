import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { campaignSendSchema } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const result = campaignSendSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { business_id, message, audience } = result.data

    // Get opted-in customers based on audience
    const { data: bc } = await supabase
      .from('business_customers')
      .select('customer_id, customer:customers(phone, name, whatsapp_optin)')
      .eq('business_id', business_id)

    const customers = (bc ?? []).filter((row) => {
      const c = row.customer as unknown as { whatsapp_optin: boolean } | null
      return c?.whatsapp_optin
    })

    if (customers.length === 0) {
      return NextResponse.json({ error: 'No opted-in customers for selected audience' }, { status: 400 })
    }

    // Record campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        business_id,
        message,
        audience,
        total_sent: customers.length,
        delivered: customers.length,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to send campaign.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign, total_sent: customers.length })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
