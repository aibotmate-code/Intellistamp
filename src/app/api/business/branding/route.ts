import { NextRequest, NextResponse } from 'next/server'
import { requireUserAndBusiness, adminClient } from '@/lib/auth'
import type { BusinessBranding } from '@/types'

const ALLOWED_PATCH_FIELDS: (keyof BusinessBranding)[] = [
  'primary_color',
  'primary_dark_color',
  'primary_light_color',
  'secondary_color',
  'accent_color',
  'background_color',
  'surface_color',
  'text_on_primary',
  'is_enabled',
]

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

// GET /api/business/branding?bizId=<uuid>
// Returns the branding record for the authenticated owner's business.
export async function GET(req: NextRequest) {
  try {
    const bizId = new URL(req.url).searchParams.get('bizId')
    if (!bizId) return NextResponse.json({ error: 'bizId required' }, { status: 400 })

    const biz = await requireUserAndBusiness(bizId)
    if (biz instanceof NextResponse) return biz

    const { data } = await adminClient
      .from('business_branding')
      .select('*')
      .eq('business_id', bizId)
      .maybeSingle()

    return NextResponse.json({ branding: data ?? null })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

// PATCH /api/business/branding
// Body: { bizId, primary_color?, secondary_color?, accent_color?, is_enabled?, ... }
// Upserts the branding record (creates if absent).
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { bizId, ...fields } = body as Record<string, unknown>
    if (!bizId || typeof bizId !== 'string') {
      return NextResponse.json({ error: 'bizId required' }, { status: 400 })
    }

    const biz = await requireUserAndBusiness(bizId)
    if (biz instanceof NextResponse) return biz

    const updates: Record<string, unknown> = {
      business_id: bizId,
      updated_at: new Date().toISOString(),
    }
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in fields) updates[key] = fields[key]
    }

    const { data, error } = await adminClient
      .from('business_branding')
      .upsert(updates, { onConflict: 'business_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save branding.' }, { status: 500 })
    }

    return NextResponse.json({ branding: data })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

// POST /api/business/branding
// Body: multipart FormData — { bizId: string, file: File }
// Validates ownership, replaces any existing logo, uploads to branding/{bizId}/logo.{ext}.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const bizId = formData.get('bizId')
    const file = formData.get('file')

    if (!bizId || typeof bizId !== 'string') {
      return NextResponse.json({ error: 'bizId required' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const biz = await requireUserAndBusiness(bizId)
    if (biz instanceof NextResponse) return biz

    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, or WebP images are allowed' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
    }

    // Remove all existing files in this business's branding folder before uploading
    const { data: existing } = await adminClient.storage.from('branding').list(bizId)
    if (existing?.length) {
      const paths = existing.map((f) => `${bizId}/${f.name}`)
      await adminClient.storage.from('branding').remove(paths)
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `${bizId}/logo.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await adminClient.storage
      .from('branding')
      .upload(storagePath, bytes, { contentType: file.type, upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const { data: branding, error: dbError } = await adminClient
      .from('business_branding')
      .upsert(
        { business_id: bizId, logo_path: storagePath, updated_at: new Date().toISOString() },
        { onConflict: 'business_id' }
      )
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save logo path.' }, { status: 500 })
    }

    const { data: { publicUrl } } = adminClient.storage.from('branding').getPublicUrl(storagePath)

    return NextResponse.json({ branding, logo_url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

// DELETE /api/business/branding?bizId=<uuid>
// Removes the logo from storage and clears logo_path.
export async function DELETE(req: NextRequest) {
  try {
    const bizId = new URL(req.url).searchParams.get('bizId')
    if (!bizId) return NextResponse.json({ error: 'bizId required' }, { status: 400 })

    const biz = await requireUserAndBusiness(bizId)
    if (biz instanceof NextResponse) return biz

    const { data: existing } = await adminClient.storage.from('branding').list(bizId)
    if (existing?.length) {
      const paths = existing.map((f) => `${bizId}/${f.name}`)
      await adminClient.storage.from('branding').remove(paths)
    }

    const { error } = await adminClient
      .from('business_branding')
      .update({ logo_path: null, updated_at: new Date().toISOString() })
      .eq('business_id', bizId)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove logo.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
