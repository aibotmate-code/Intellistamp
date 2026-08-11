import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { 
  validateSocialUrl, 
  validateWhatsAppNumber, 
  ALLOWED_GOOGLE_HOSTS, 
  ALLOWED_INSTAGRAM_HOSTS, 
  ALLOWED_FACEBOOK_HOSTS, 
  ALLOWED_YOUTUBE_HOSTS, 
  ALLOWED_X_HOSTS 
} from '@/lib/server/social'
import { z } from 'zod'

const linkSchema = z.object({
  google_review_url: z.string().optional().nullable(),
  instagram_url: z.string().optional().nullable(),
  facebook_url: z.string().optional().nullable(),
  youtube_url: z.string().optional().nullable(),
  x_url: z.string().optional().nullable(),
  whatsapp_number: z.string().optional().nullable(),
  whatsapp_message: z.string().optional().nullable()
})

export async function GET(req: NextRequest) {
  try {
    const { supabase, business } = await requireUser()
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('business_social_links')
      .select('google_review_url, instagram_url, facebook_url, youtube_url, x_url, whatsapp_number, whatsapp_message')
      .eq('business_id', business.id)
      .maybeSingle()

    if (error) {
      console.error('[social-links] fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({ social_links: data || {} })
  } catch (error: any) {
    console.error('[social-links GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase, business } = await requireUser()
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = linkSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const input = parsed.data
    
    // Normalization helper
    const normalize = (val: string | null | undefined) => val && val.trim() ? val.trim() : null

    const google_review_url = validateSocialUrl(normalize(input.google_review_url), ALLOWED_GOOGLE_HOSTS)
    const instagram_url = validateSocialUrl(normalize(input.instagram_url), ALLOWED_INSTAGRAM_HOSTS)
    const facebook_url = validateSocialUrl(normalize(input.facebook_url), ALLOWED_FACEBOOK_HOSTS)
    const youtube_url = validateSocialUrl(normalize(input.youtube_url), ALLOWED_YOUTUBE_HOSTS)
    const x_url = validateSocialUrl(normalize(input.x_url), ALLOWED_X_HOSTS)
    const whatsapp_number = validateWhatsAppNumber(normalize(input.whatsapp_number))
    const whatsapp_message = normalize(input.whatsapp_message)?.substring(0, 200) || null

    const payload = {
      business_id: business.id,
      google_review_url,
      instagram_url,
      facebook_url,
      youtube_url,
      x_url,
      whatsapp_number,
      whatsapp_message,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('business_social_links')
      .upsert(payload, { onConflict: 'business_id' })

    if (error) {
      console.error('[social-links PUT] db error:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, social_links: payload })
  } catch (error: any) {
    console.error('[social-links PUT]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
