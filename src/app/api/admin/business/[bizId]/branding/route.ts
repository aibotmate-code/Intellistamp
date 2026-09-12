import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireIntellicalAdmin } from '@/lib/auth'
import { isValidHexColor, parseAndValidateImage, validateHiddenRewardText } from '@/lib/branding/validation'
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

    const overlayOpacity = data.card_bg_overlay_opacity !== null && data.card_bg_overlay_opacity !== undefined
      ? Number(data.card_bg_overlay_opacity)
      : 0.6

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
        card_background_image_url: getPublicUrl(data.card_bg_image_path),
        card_bg_overlay_opacity: overlayOpacity,
        hide_reward_details: data.hide_reward_details ?? false,
        hidden_reward_text: data.hidden_reward_text ?? 'Surprise reward',
        logo_position_x: data.logo_position_x != null ? Number(data.logo_position_x) : 50,
        logo_position_y: data.logo_position_y != null ? Number(data.logo_position_y) : 50,
        logo_scale: data.logo_scale != null ? Number(data.logo_scale) : 1,
        background_position_x: data.background_position_x != null ? Number(data.background_position_x) : 50,
        background_position_y: data.background_position_y != null ? Number(data.background_position_y) : 50,
        background_scale: data.background_scale != null ? Number(data.background_scale) : 1,
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
    const bgImageFile = formData.get('bg_image') as File | null

    const cardTextColor = parseOptionalColor(formData.get('card_text_color'))
    const cardMutedTextColor = parseOptionalColor(formData.get('card_muted_text_color'))
    const emptyStampColor = parseOptionalColor(formData.get('empty_stamp_color'))
    const emptyStampBorderColor = parseOptionalColor(formData.get('empty_stamp_border_color'))

    // Parse and validate overlay opacity (0.2 to 0.9, default 0.6)
    const rawOverlay = formData.get('card_bg_overlay_opacity')
    let cardBgOverlayOpacity = 0.6
    if (rawOverlay !== null && rawOverlay !== undefined && String(rawOverlay).trim() !== '') {
      const parsed = parseFloat(String(rawOverlay))
      if (isNaN(parsed) || parsed < 0.2 || parsed > 0.9) {
        return NextResponse.json(
          { error: 'Card background overlay opacity must be between 0.2 and 0.9' },
          { status: 400 }
        )
      }
      cardBgOverlayOpacity = Math.round(parsed * 100) / 100
    }

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
      .select('logo_path, card_bg_image_path, hide_reward_details, hidden_reward_text, logo_position_x, logo_position_y, logo_scale, background_position_x, background_position_y, background_scale')
      .eq('business_id', bizId)
      .maybeSingle()

    let newLogoPath: string | null = existingBranding?.logo_path || null
    let uploadedLogoToStorage = false

    let newBgImagePath: string | null = existingBranding?.card_bg_image_path || null
    let uploadedBgToStorage = false

    // Logo upload handling
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
      const filePath = `${bizId}/logo_${randomId}.${sanitizedExt}`

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
      uploadedLogoToStorage = true
    }

    // Card background pattern / image upload handling
    if (bgImageFile && typeof bgImageFile !== 'string' && bgImageFile.size > 0) {
      if (bgImageFile.size > 2 * 1024 * 1024) {
        if (uploadedLogoToStorage && newLogoPath) {
          await adminClient.storage.from('branding').remove([newLogoPath])
        }
        return NextResponse.json({ error: 'Background image size exceeds 2 MB limit' }, { status: 400 })
      }

      const arrayBuffer = await bgImageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      try {
        parseAndValidateImage(buffer)
      } catch (err) {
        if (uploadedLogoToStorage && newLogoPath) {
          await adminClient.storage.from('branding').remove([newLogoPath])
        }
        const message = err instanceof Error ? err.message : 'Invalid background image'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      const randomId = crypto.randomUUID()
      const ext = bgImageFile.name.split('.').pop() || 'png'
      const sanitizedExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'png'
      const filePath = `${bizId}/bg_${randomId}.${sanitizedExt}`

      const { error: uploadError } = await adminClient.storage
        .from('branding')
        .upload(filePath, buffer, {
          contentType: bgImageFile.type,
          upsert: true,
        })

      if (uploadError) {
        if (uploadedLogoToStorage && newLogoPath) {
          await adminClient.storage.from('branding').remove([newLogoPath])
        }
        return NextResponse.json({ error: 'Background image storage upload failed' }, { status: 500 })
      }

      newBgImagePath = filePath
      uploadedBgToStorage = true
    }

    const hideRewardDetails = formData.has('hide_reward_details')
      ? formData.get('hide_reward_details') === 'true'
      : (existingBranding?.hide_reward_details ?? false)

    const rawHiddenRewardText = formData.has('hidden_reward_text')
      ? (formData.get('hidden_reward_text') as string)
      : (existingBranding?.hidden_reward_text ?? 'Surprise reward')

    const hiddenRewardValidation = validateHiddenRewardText(rawHiddenRewardText, hideRewardDetails)
    if (!hiddenRewardValidation.valid) {
      return NextResponse.json({ error: hiddenRewardValidation.error }, { status: 400 })
    }
    const hiddenRewardText = hiddenRewardValidation.value

    const parseCoord = (val: FormDataEntryValue | null, fallback: number, min: number, max: number): number => {
      if (val === null || val === undefined || String(val).trim() === '') return fallback
      const num = parseFloat(String(val))
      if (isNaN(num)) return fallback
      return Math.max(min, Math.min(max, Math.round(num * 100) / 100))
    }

    const logoPositionX = parseCoord(formData.get('logo_position_x'), existingBranding?.logo_position_x != null ? Number(existingBranding.logo_position_x) : 50, 0, 100)
    const logoPositionY = parseCoord(formData.get('logo_position_y'), existingBranding?.logo_position_y != null ? Number(existingBranding.logo_position_y) : 50, 0, 100)
    const logoScale = parseCoord(formData.get('logo_scale'), existingBranding?.logo_scale != null ? Number(existingBranding.logo_scale) : 1, 1, 3)
    const backgroundPositionX = parseCoord(formData.get('background_position_x'), existingBranding?.background_position_x != null ? Number(existingBranding.background_position_x) : 50, 0, 100)
    const backgroundPositionY = parseCoord(formData.get('background_position_y'), existingBranding?.background_position_y != null ? Number(existingBranding.background_position_y) : 50, 0, 100)
    const backgroundScale = parseCoord(formData.get('background_scale'), existingBranding?.background_scale != null ? Number(existingBranding.background_scale) : 1, 1, 3)

    const brandingData: Record<string, unknown> = {
      business_id: bizId,
      logo_path: newLogoPath,
      card_bg_image_path: newBgImagePath,
      card_bg_overlay_opacity: cardBgOverlayOpacity,
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
      hide_reward_details: hideRewardDetails,
      hidden_reward_text: hiddenRewardText,
      logo_position_x: logoPositionX,
      logo_position_y: logoPositionY,
      logo_scale: logoScale,
      background_position_x: backgroundPositionX,
      background_position_y: backgroundPositionY,
      background_scale: backgroundScale,
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

    // Graceful fallback if database migration has not been applied yet
    if (saveError && saveError.message && saveError.message.includes('column') && saveError.message.includes('does not exist')) {
      const fallbackData = { ...brandingData }
      delete fallbackData.logo_position_x
      delete fallbackData.logo_position_y
      delete fallbackData.logo_scale
      delete fallbackData.background_position_x
      delete fallbackData.background_position_y
      delete fallbackData.background_scale

      const retry = existingBranding
        ? await adminClient.from('business_branding').update(fallbackData).eq('business_id', bizId)
        : await adminClient.from('business_branding').insert(fallbackData)
      saveError = retry.error
    }

    if (saveError) {
      if (uploadedLogoToStorage && newLogoPath) {
        await adminClient.storage.from('branding').remove([newLogoPath])
      }
      if (uploadedBgToStorage && newBgImagePath) {
        await adminClient.storage.from('branding').remove([newBgImagePath])
      }
      return NextResponse.json({ error: 'Database save failed.' }, { status: 500 })
    }

    // Sync businesses table if hide_reward_details was supplied
    if (formData.has('hide_reward_details')) {
      await adminClient
        .from('businesses')
        .update({ hide_reward_details: hideRewardDetails })
        .eq('id', bizId)
    }

    // Clean up replaced files from storage
    if (uploadedLogoToStorage && existingBranding?.logo_path && existingBranding.logo_path !== newLogoPath) {
      await adminClient.storage.from('branding').remove([existingBranding.logo_path])
    }
    if (uploadedBgToStorage && existingBranding?.card_bg_image_path && existingBranding.card_bg_image_path !== newBgImagePath) {
      await adminClient.storage.from('branding').remove([existingBranding.card_bg_image_path])
    }

    return NextResponse.json({
      success: true,
      branding: {
        business_id: bizId,
        logo_url: getPublicUrl(newLogoPath),
        card_background_image_url: getPublicUrl(newBgImagePath),
        card_bg_overlay_opacity: cardBgOverlayOpacity,
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
        hide_reward_details: hideRewardDetails,
        hidden_reward_text: hiddenRewardText,
        logo_position_x: logoPositionX,
        logo_position_y: logoPositionY,
        logo_scale: logoScale,
        background_position_x: backgroundPositionX,
        background_position_y: backgroundPositionY,
        background_scale: backgroundScale,
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
    const action = searchParams.get('action') // 'remove-logo', 'remove-bg-image', or 'reset-branding'

    if (action !== 'remove-logo' && action !== 'remove-bg-image' && action !== 'reset-branding') {
      return NextResponse.json(
        { error: 'Valid action required (remove-logo, remove-bg-image, or reset-branding)' },
        { status: 400 }
      )
    }

    const { data: branding } = await adminClient
      .from('business_branding')
      .select('logo_path, card_bg_image_path')
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
    } else if (action === 'remove-bg-image') {
      if (!branding) {
        return NextResponse.json({ error: 'Branding not found' }, { status: 404 })
      }

      const { error: updateError } = await adminClient
        .from('business_branding')
        .update({ card_bg_image_path: null, updated_at: new Date().toISOString() })
        .eq('business_id', bizId)

      if (updateError) {
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      if (branding.card_bg_image_path) {
        await adminClient.storage.from('branding').remove([branding.card_bg_image_path])
      }

      return NextResponse.json({ success: true, message: 'Card background image removed successfully' })
    } else {
      // reset-branding
      const { error: deleteError } = await adminClient
        .from('business_branding')
        .delete()
        .eq('business_id', bizId)

      if (deleteError) {
        return NextResponse.json({ error: 'Database reset failed' }, { status: 500 })
      }

      const filesToRemove: string[] = []
      if (branding?.logo_path) filesToRemove.push(branding.logo_path)
      if (branding?.card_bg_image_path) filesToRemove.push(branding.card_bg_image_path)

      if (filesToRemove.length > 0) {
        await adminClient.storage.from('branding').remove(filesToRemove)
      }

      return NextResponse.json({ success: true, message: 'Branding reset to defaults' })
    }
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
