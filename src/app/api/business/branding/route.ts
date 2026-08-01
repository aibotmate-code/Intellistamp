import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireUser, requireBusiness } from '@/lib/auth'
import { isValidHexColor, parseAndValidateImage } from '@/lib/branding/validation'

function checkFeatureFlag() {
  return (
    process.env.TENANT_BRANDING_ENABLED === 'true' &&
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true'
  )
}

// Helper to construct a public URL from a relative path
function getPublicUrl(path: string | null): string | null {
  if (!path) return null
  const { data } = adminClient.storage.from('branding').getPublicUrl(path)
  return data.publicUrl || null
}

export async function GET(req: NextRequest) {
  if (!checkFeatureFlag()) {
    return NextResponse.json({ error: 'Branding feature is disabled' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const slug = searchParams.get('slug')

  if (!businessId && !slug) {
    return NextResponse.json({ error: 'businessId or slug required' }, { status: 400 })
  }

  try {
    let query = adminClient.from('business_branding').select('*, business:businesses(*)')

    if (businessId) {
      query = query.eq('business_id', businessId)
    } else {
      query = query.eq('business.slug', slug!)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Database fetch failed' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ branding: null })
    }

    // Map database result to public presentation-safe response shape
    return NextResponse.json({
      branding: {
        business_id: data.business_id,
        logo_url: getPublicUrl(data.logo_path),
        primary_color: data.primary_color,
        primary_dark_color: data.primary_dark_color,
        primary_light_color: data.primary_light_color,
        secondary_color: data.secondary_color,
        accent_color: data.accent_color,
        background_color: data.background_color,
        surface_color: data.surface_color,
        text_on_primary: data.text_on_primary,
        is_enabled: data.is_enabled,
        card_text_color: data.card_text_color,
        card_muted_text_color: data.card_muted_text_color,
        empty_stamp_color: data.empty_stamp_color,
        empty_stamp_border_color: data.empty_stamp_border_color,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!checkFeatureFlag()) {
    return NextResponse.json({ error: 'Branding feature is disabled' }, { status: 403 })
  }

  // 1. Authenticate user first before parsing body
  const userOrError = await requireUser()
  if (userOrError instanceof NextResponse) return userOrError

  try {
    const formData = await req.formData()
    const businessId = formData.get('business_id') as string

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    // 2. Authorize business owner
    const biz = await requireBusiness(userOrError, businessId)
    if (biz instanceof NextResponse) {
      // Map 404 from requireBusiness to 403 to match the expected unit test status for unauthorized owner
      if (biz.status === 404) {
        return NextResponse.json({ error: 'Access forbidden: not the owner' }, { status: 403 })
      }
      return biz
    }

    // Extract and validate parameters
    const parseOptionalColor = (val: FormDataEntryValue | null): string | null => {
      if (val === null || val === undefined) return null
      const s = String(val).trim()
      return s === '' ? null : s
    }

    const primaryColor = formData.get('primary_color') as string
    const primaryDarkColor = formData.get('primary_dark_color') as string
    const primaryLightColor = formData.get('primary_light_color') as string
    const secondaryColor = parseOptionalColor(formData.get('secondary_color'))
    const accentColor = parseOptionalColor(formData.get('accent_color'))
    const backgroundColor = parseOptionalColor(formData.get('background_color'))
    const surfaceColor = parseOptionalColor(formData.get('surface_color'))
    const textOnPrimary = formData.get('text_on_primary') as string
    const isEnabled = formData.get('is_enabled') === 'true'
    const logoFile = formData.get('logo') as File | null

    const cardTextColor = parseOptionalColor(formData.get('card_text_color'))
    const cardMutedTextColor = parseOptionalColor(formData.get('card_muted_text_color'))
    const emptyStampColor = parseOptionalColor(formData.get('empty_stamp_color'))
    const emptyStampBorderColor = parseOptionalColor(formData.get('empty_stamp_border_color'))

    // Validate colors (must be normalized #RRGGBB)
    const colorFields = [
      { name: 'primary_color', val: primaryColor },
      { name: 'primary_dark_color', val: primaryDarkColor },
      { name: 'primary_light_color', val: primaryLightColor },
      { name: 'text_on_primary', val: textOnPrimary },
    ]

    for (const field of colorFields) {
      if (!isValidHexColor(field.val)) {
        return NextResponse.json({ error: `Invalid color format for ${field.name}` }, { status: 400 })
      }
    }

    const optionalColors = [
      secondaryColor,
      accentColor,
      backgroundColor,
      surfaceColor,
      cardTextColor,
      cardMutedTextColor,
      emptyStampColor,
      emptyStampBorderColor,
    ]
    for (const c of optionalColors) {
      if (c && !isValidHexColor(c)) {
        return NextResponse.json({ error: 'Invalid optional color format' }, { status: 400 })
      }
    }

    // Check existing branding row to determine if we update or insert, and get old logo path
    const { data: existingBranding } = await adminClient
      .from('business_branding')
      .select('logo_path')
      .eq('business_id', businessId)
      .maybeSingle()

    let newLogoPath: string | null = existingBranding?.logo_path || null
    let uploadedToStorage = false

    // File uploads and checks if file was provided
    if (logoFile && typeof logoFile !== 'string' && logoFile.size > 0) {
      // Size check (2MB limit)
      if (logoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Logo file size exceeds 2 MB limit' }, { status: 400 })
      }

      // Convert to buffer for magic bytes and dimension check
      const arrayBuffer = await logoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      try {
        parseAndValidateImage(buffer)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid logo image'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      // Generate randomized filename under namespace branding/{businessId}/{randomId}
      const randomId = crypto.randomUUID()
      const ext = logoFile.name.split('.').pop() || 'png'
      const sanitizedExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'png'
      const filePath = `${businessId}/${randomId}.${sanitizedExt}`

      // Upload to Supabase Storage (branding bucket)
      const { error: uploadError } = await adminClient.storage
        .from('branding')
        .upload(filePath, buffer, {
          contentType: logoFile.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('[branding POST] storage upload error:', uploadError.message, uploadError)
        return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
      }

      newLogoPath = filePath
      uploadedToStorage = true
    }

    // Database Save operation
    const brandingData = {
      business_id: businessId,
      logo_path: newLogoPath,
      primary_color: primaryColor,
      primary_dark_color: primaryDarkColor,
      primary_light_color: primaryLightColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      background_color: backgroundColor,
      surface_color: surfaceColor,
      text_on_primary: textOnPrimary,
      is_enabled: isEnabled,
      card_text_color: cardTextColor,
      card_muted_text_color: cardMutedTextColor,
      empty_stamp_color: emptyStampColor,
      empty_stamp_border_color: emptyStampBorderColor,
      updated_at: new Date().toISOString(),
    }

    let saveError = null

    if (existingBranding) {
      const { error } = await adminClient
        .from('business_branding')
        .update(brandingData)
        .eq('business_id', businessId)
      saveError = error
    } else {
      const { error } = await adminClient
        .from('business_branding')
        .insert(brandingData)
      saveError = error
    }

    // DB Fail Cleanup: If DB write fails, delete uploaded file immediately to prevent orphan
    if (saveError) {
      if (uploadedToStorage && newLogoPath) {
        await adminClient.storage.from('branding').remove([newLogoPath])
      }
      return NextResponse.json({ error: 'Database save failed. File changes rolled back.' }, { status: 500 })
    }

    // Success Cleanup: If new logo succeeded and old logo existed, delete old logo from storage
    if (uploadedToStorage && existingBranding?.logo_path) {
      await adminClient.storage.from('branding').remove([existingBranding.logo_path])
    }

    return NextResponse.json({
      success: true,
      branding: {
        business_id: businessId,
        logo_url: getPublicUrl(newLogoPath),
        primary_color: primaryColor,
        primary_dark_color: primaryDarkColor,
        primary_light_color: primaryLightColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        background_color: backgroundColor,
        surface_color: surfaceColor,
        text_on_primary: textOnPrimary,
        is_enabled: isEnabled,
        card_text_color: cardTextColor,
        card_muted_text_color: cardMutedTextColor,
        empty_stamp_color: emptyStampColor,
        empty_stamp_border_color: emptyStampBorderColor,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkFeatureFlag()) {
    return NextResponse.json({ error: 'Branding feature is disabled' }, { status: 403 })
  }

  // 1. Authenticate user first
  const userOrError = await requireUser()
  if (userOrError instanceof NextResponse) return userOrError

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const action = searchParams.get('action') // 'remove-logo' or 'reset-branding'

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  if (action !== 'remove-logo' && action !== 'reset-branding') {
    return NextResponse.json({ error: 'Valid action required (remove-logo or reset-branding)' }, { status: 400 })
  }

  // 2. Authorize business owner
  const biz = await requireBusiness(userOrError, businessId)
  if (biz instanceof NextResponse) {
    // Map 404 from requireBusiness to 403 to match the expected unit test status for unauthorized owner
    if (biz.status === 404) {
      return NextResponse.json({ error: 'Access forbidden: not the owner' }, { status: 403 })
    }
    return biz
  }

  try {
    // Fetch current logo path
    const { data: branding } = await adminClient
      .from('business_branding')
      .select('logo_path')
      .eq('business_id', businessId)
      .maybeSingle()

    if (action === 'remove-logo') {
      if (!branding) {
        return NextResponse.json({ error: 'Branding details not found' }, { status: 404 })
      }

      // Update DB logo_path to null
      const { error: updateError } = await adminClient
        .from('business_branding')
        .update({ logo_path: null, updated_at: new Date().toISOString() })
        .eq('business_id', businessId)

      if (updateError) {
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      // Delete old logo file from storage
      if (branding.logo_path) {
        await adminClient.storage.from('branding').remove([branding.logo_path])
      }

      return NextResponse.json({ success: true, message: 'Logo removed successfully' })
    } else {
      // Action: reset-branding (Delete row entirely)
      const { error: deleteError } = await adminClient
        .from('business_branding')
        .delete()
        .eq('business_id', businessId)

      if (deleteError) {
        return NextResponse.json({ error: 'Database reset failed' }, { status: 500 })
      }

      // Delete logo file from storage if it exists
      if (branding?.logo_path) {
        await adminClient.storage.from('branding').remove([branding.logo_path])
      }

      return NextResponse.json({ success: true, message: 'Branding reset successfully' })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
