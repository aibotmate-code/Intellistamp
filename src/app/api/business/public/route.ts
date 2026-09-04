import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/auth'

// Safe subset: never includes staff_pin, staff_pin_hash, owner_id, owner_phone
const PUBLIC_FIELDS =
  'id, name, slug, emoji, category, stamps_required, reward, gmb_link, ' +
  'dynamic_qr_enabled, staff_pin_enabled, whatsapp_enabled, branding:business_branding(*)'

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

    let businessWithBranding = null
    if (business) {
      const rawBranding = (business as unknown as {
        branding?: {
          logo_path?: string | null
          card_bg_image_path?: string | null
          card_bg_overlay_opacity?: number | null
          [key: string]: unknown
        } | null
      }).branding
      let mappedBranding = null
      if (rawBranding) {
        let logo_url = null
        if (rawBranding.logo_path) {
          const { data } = adminClient.storage.from('branding').getPublicUrl(rawBranding.logo_path)
          logo_url = data?.publicUrl || null
        }
        let card_background_image_url = null
        if (rawBranding.card_bg_image_path) {
          const { data } = adminClient.storage.from('branding').getPublicUrl(rawBranding.card_bg_image_path)
          card_background_image_url = data?.publicUrl || null
        }
        mappedBranding = {
          ...rawBranding,
          logo_url,
          card_background_image_url,
          card_background_overlay: rawBranding.card_bg_overlay_opacity ? Number(rawBranding.card_bg_overlay_opacity) : 0.6,
        }
      }
      businessWithBranding = {
        ...(business as unknown as Record<string, unknown>),
        branding: mappedBranding
      }
    }

    return NextResponse.json({ business: businessWithBranding })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
