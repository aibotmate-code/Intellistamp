import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/auth'

// Safe subset: never includes staff_pin, staff_pin_hash, owner_id, owner_phone
const PUBLIC_FIELDS =
  'id, name, slug, emoji, category, stamps_required, reward, gmb_link, ' +
  'dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bizId = searchParams.get('bizId')
  const slug = searchParams.get('slug')

  if (!bizId && !slug) {
    return NextResponse.json({ error: 'bizId or slug required' }, { status: 400 })
  }

  try {
    let query = adminClient.from('businesses').select(PUBLIC_FIELDS)
    if (bizId) query = query.eq('id', bizId)
    else query = query.eq('slug', slug!)

    const { data: business, error } = await query.maybeSingle()

    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json({ business })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
