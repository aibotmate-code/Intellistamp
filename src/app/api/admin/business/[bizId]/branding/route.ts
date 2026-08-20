import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireIntellicalAdmin } from '@/lib/auth'
import { isValidHexColor, parseAndValidateImage } from '@/lib/branding/validation'
import crypto from 'crypto'

// Helper to construct a public URL from a relative storage path
function getPublicUrl(path: string | null): string | null {
  if (!path) return null
  const { data } = adminClient.storage.from('branding').getPublicUrl(path)
  return data?.publicUrl || null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const { data, error } = await adminClient
      .from('business_branding')
      .select('*')
      .eq('business_id', bizId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Database fetch failed' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ branding: null })
    }

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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    // Verify business exists
    const { data: business, error: bizError } = await adminClient
      .from('businesses')
      .select('id')
      .eq('id', bizId)
      .maybeSingle()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const formData = await req.formData()

    const parseOptionalColor = (val: FormDataEntryValue | null): string | null => {
      if (val === null || val === undefined) return null
      const s = String(val).trim()
      return s === '' ? null : s
    }

    const primaryColor = formData.get('primary_color') as string
    const primaryDarkColor = (formData.get('primary_dark_color') as string) || primaryColor
    const primaryLightColor = (formData.get('primary_light_color') as string) || primaryColor
    const secondaryColor = parseOptionalColor(formData.get('secondary_color'))
    const accentColor = parseOptionalColor(formData.get('accent_color'))
    const backgroundColor = parseOptionalColor(formData.get('background_color'))
    const surfaceColor = parseOptionalColor(formData.get('surface_color'))
    const textOnPrimary = (formData.get('text_on_primary') as string) || '#09090B'
    const isEnabled = formData.get('is_enabled') !== 'false'
    const logoFile = formData.get('logo') as File | null

    const cardTextColor = parseOptionalColor(formData.get('card_text_color'))
    const cardMutedTextColor = parseOptionalColor(formData.get('card_muted_text_color'))
    const emptyStampColor = parseOptionalColor(formData.get('empty_stamp_color'))
    const emptyStampBorderColor = parseOptionalColor(formData.get('empty_stamp_border_color'))

    // Validate required colors
    const requiredColorFields = [
      { name: 'primary_color', val: primaryColor },
      { name: 'primary_dark_color', val: primaryDarkColor },
      { name: 'primary_light_color', val: primaryLightColor },
      { name: 'text_on_primary', val: textOnPrimary },
    ]

    for (const field of requiredColorFields) {
      if (!isValidHexColor(field.val)) {
        return NextResponse.json({ error: `Invalid color format for ${field.name}` }, { status: 400 })
      }
    }

    // Validate optional colors
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

    // Existing branding record check
    const { data: existingBranding } = await adminClient
      .from('business_branding')
      .select('logo_path')
      .eq('business_id', bizId)
      .maybeSingle()

    let newLogoPath: string | null = existingBranding?.logo_path || null
    let uploadedToStorage = false

    // File upload handling
    if (logoFile && typeof logoFile !== 'string' && logoFile.size > 0) {
      if (logoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Logo file size exceeds 2 MB limit' }, { status: 400 })
      }

      const arrayBuffer = await logoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      try {
        parseAndValidateImage(buffer)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid logo image'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      const randomId = crypto.randomUUID()
      const ext = logoFile.name.split('.').pop() || 'png'
      const sanitizedExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'png'
      const filePath = `${bizId}/${randomId}.${sanitizedExt}`

      const { error: uploadError } = await adminClient.storage
        .from('branding')
        .upload(filePath, buffer, {
          contentType: logoFile.type,
          upsert: true,
        })

      if (uploadError) {
        return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
      }

      newLogoPath = filePath
      uploadedToStorage = true
    }

    const brandingData = {
      business_id: bizId,
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
        .eq('business_id', bizId)
      saveError = error
    } else {
      const { error } = await adminClient
        .from('business_branding')
        .insert(brandingData)
      saveError = error
    }

    if (saveError) {
      if (uploadedToStorage && newLogoPath) {
        await adminClient.storage.from('branding').remove([newLogoPath])
      }
      return NextResponse.json({ error: 'Database save failed.' }, { status: 500 })
    }

    if (uploadedToStorage && existingBranding?.logo_path) {
      await adminClient.storage.from('branding').remove([existingBranding.logo_path])
    }

    return NextResponse.json({
      success: true,
      branding: {
        business_id: bizId,
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  try {
    const { bizId } = await params
    const adminOrError = await requireIntellicalAdmin()
    if (adminOrError instanceof NextResponse) return adminOrError

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') // 'remove-logo' or 'reset-branding'

    if (action !== 'remove-logo' && action !== 'reset-branding') {
      return NextResponse.json({ error: 'Valid action required (remove-logo or reset-branding)' }, { status: 400 })
    }

    const { data: branding } = await adminClient
      .from('business_branding')
      .select('logo_path')
      .eq('business_id', bizId)
      .maybeSingle()

    if (action === 'remove-logo') {
      if (!branding) {
        return NextResponse.json({ error: 'Branding not found' }, { status: 404 })
      }

      const { error: updateError } = await adminClient
        .from('business_branding')
        .update({ logo_path: null, updated_at: new Date().toISOString() })
        .eq('business_id', bizId)

      if (updateError) {
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      if (branding.logo_path) {
        await adminClient.storage.from('branding').remove([branding.logo_path])
      }

      return NextResponse.json({ success: true, message: 'Logo removed successfully' })
    } else {
      const { error: deleteError } = await adminClient
        .from('business_branding')
        .delete()
        .eq('business_id', bizId)

      if (deleteError) {
        return NextResponse.json({ error: 'Database reset failed' }, { status: 500 })
      }

      if (branding?.logo_path) {
        await adminClient.storage.from('branding').remove([branding.logo_path])
      }

      return NextResponse.json({ success: true, message: 'Branding reset to defaults' })
    }
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
