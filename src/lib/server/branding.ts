import { adminClient } from '@/lib/auth'
import type { BusinessBranding } from '@/types'

export interface RawBrandingRow {
  id?: string
  business_id?: string
  logo_path?: string | null
  card_bg_image_path?: string | null
  card_bg_overlay_opacity?: number | string | null
  card_background_overlay?: number | string | null
  primary_color?: string
  primary_dark_color?: string
  primary_light_color?: string
  secondary_color?: string | null
  accent_color?: string | null
  background_color?: string | null
  surface_color?: string | null
  text_on_primary?: string
  is_enabled?: boolean
  card_text_color?: string | null
  card_muted_text_color?: string | null
  empty_stamp_color?: string | null
  empty_stamp_border_color?: string | null
  hide_reward_details?: boolean
  hidden_reward_text?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface StorageUrlProvider {
  from: (bucket: string) => {
    getPublicUrl: (path: string) => { data: { publicUrl: string } | null }
  }
}

/**
 * Maps a database business_branding row into a canonical BusinessBranding object.
 * Resolves public URLs for logo_path and card_bg_image_path, and normalizes overlay opacity.
 */
export function mapServerBranding(
  rawBranding: RawBrandingRow | RawBrandingRow[] | null | undefined,
  storageClient?: StorageUrlProvider
): BusinessBranding | null {
  if (!rawBranding) return null

  // If passed as an array (e.g. from a Supabase join), take the first item
  const row = Array.isArray(rawBranding) ? rawBranding[0] : rawBranding
  if (!row) return null

  const storage = storageClient || adminClient.storage

  let logo_url: string | null = null
  if (row.logo_path) {
    const { data } = storage.from('branding').getPublicUrl(row.logo_path)
    logo_url = data?.publicUrl || null
  }

  let card_background_image_url: string | null = null
  if (row.card_bg_image_path) {
    const { data } = storage.from('branding').getPublicUrl(row.card_bg_image_path)
    card_background_image_url = data?.publicUrl || null
  }

  const rawOverlay = row.card_bg_overlay_opacity ?? row.card_background_overlay
  const overlay =
    rawOverlay !== null && rawOverlay !== undefined && !isNaN(Number(rawOverlay))
      ? Number(rawOverlay)
      : 0.6

  const clampedOverlay = Math.max(0.2, Math.min(0.9, overlay))

  return {
    ...(row as unknown as BusinessBranding),
    logo_url,
    card_background_image_url,
    card_background_overlay: clampedOverlay,
  }
}
