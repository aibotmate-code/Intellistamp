import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/auth'
import { mapServerBranding, type RawBrandingRow } from '@/lib/server/branding'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Safe subset: never includes staff_pin, staff_pin_hash, owner_id, owner_phone
const PUBLIC_FIELDS =
  'id, name, slug, emoji, category, stamps_required, reward, gmb_link, ' +
  'dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled, hide_reward_details, branding:business_branding(*)'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bizId = searchParams.get('bizId')
  const slug = searchParams.get('slug')

  if (!bizId && !slug) {
    return NextResponse.json({ error: 'bizId or slug required' }, { status: 400 })
  }

  try {
    let query = adminClient.from('businesses').select(PUBLIC_FIELDS)
    if (bizId) {
      if (UUID_REGEX.test(bizId)) {
        query = query.eq('id', bizId)
      } else {
        query = query.eq('slug', bizId)
      }
    } else {
      query = query.eq('slug', slug!)
    }

    const { data: business, error } = await query.maybeSingle()

    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    let businessWithBranding = null
    if (business) {
      const rawBranding = (business as unknown as {
        branding?: RawBrandingRow | RawBrandingRow[] | null
      }).branding

      const mappedBranding = mapServerBranding(rawBranding, adminClient.storage)

      businessWithBranding = {
        ...(business as unknown as Record<string, unknown>),
        branding: mappedBranding,
      }
    }

    const res = NextResponse.json({ business: businessWithBranding })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return res
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
