import type { BusinessBranding } from '@/types'


export interface ExtractedColors {
  primary_color: string
  primary_dark_color: string
  primary_light_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  surface_color: string
  text_on_primary: string
}

// Default fallback palette (similar to IntelliStamp defaults or safe brand fallback)
export const DEFAULT_BRAND_PALETTE: ExtractedColors = {
  primary_color: '#FACC15',       // gold
  primary_dark_color: '#CA8A04',  // dark gold
  primary_light_color: '#FEF9C3', // light gold
  secondary_color: '#E2E8F0',     // slate
  accent_color: '#3B82F6',        // blue
  background_color: '#09090B',    // zinc-950
  surface_color: '#18181B',       // zinc-900
  text_on_primary: '#000000',     // black
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const l1 = getLuminance(...rgb1)
  const l2 = getLuminance(...rgb2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.match(/^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/)
  if (!match) return null
  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)))
  const rh = clamp(r).toString(16).padStart(2, '0')
  const gh = clamp(g).toString(16).padStart(2, '0')
  const bh = clamp(b).toString(16).padStart(2, '0')
  return `#${rh}${gh}${bh}`.toUpperCase()
}

/**
 * Calculates optimal text color and adjusts background if necessary to achieve 4.5:1 contrast ratio.
 */
export function ensureWcagContrast(
  bgHex: string
): { bgHex: string; textHex: string } {
  const rgb = hexToRgb(bgHex)
  if (!rgb) return { bgHex, textHex: '#FFFFFF' }

  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [24, 24, 27] // zinc-900

  const contrastWithWhite = getContrastRatio(rgb, white)
  const contrastWithBlack = getContrastRatio(rgb, black)

  if (contrastWithWhite >= 4.5) {
    return { bgHex, textHex: '#FFFFFF' }
  }
  if (contrastWithBlack >= 4.5) {
    return { bgHex, textHex: '#18181B' }
  }

  // If neither matches 4.5:1, adjust background color luminance
  // If contrast with white was higher, make it darker
  if (contrastWithWhite >= contrastWithBlack) {
    let [r, g, b] = rgb
    while (getContrastRatio([r, g, b], white) < 4.5) {
      r = Math.max(0, Math.floor(r * 0.9))
      g = Math.max(0, Math.floor(g * 0.9))
      b = Math.max(0, Math.floor(b * 0.9))
      if (r === 0 && g === 0 && b === 0) break
    }
    return { bgHex: rgbToHex(r, g, b), textHex: '#FFFFFF' }
  } else {
    // Make it lighter to pass with black
    let [r, g, b] = rgb
    while (getContrastRatio([r, g, b], black) < 4.5) {
      r = Math.min(255, Math.floor(r + (255 - r) * 0.1))
      g = Math.min(255, Math.floor(g + (255 - g) * 0.1))
      b = Math.min(255, Math.floor(b + (255 - b) * 0.1))
      if (r === 255 && g === 255 && b === 255) break
    }
    return { bgHex: rgbToHex(r, g, b), textHex: '#18181B' }
  }
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h * 360, s, l]
}

/**
 * Extracts a suggested color palette from an image element.
 */
export function extractPaletteFromImage(
  imgElement: HTMLImageElement
): ExtractedColors {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return DEFAULT_BRAND_PALETTE

  // Downsample to 50x50
  canvas.width = 50
  canvas.height = 50
  ctx.drawImage(imgElement, 0, 0, 50, 50)

  const imgData = ctx.getImageData(0, 0, 50, 50)
  const data = imgData.data

  const colorBins: { [binKey: string]: { rgb: [number, number, number]; count: number } } = {}

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    // 1. Ignore highly transparent pixels
    if (a < 128) continue

    const [h, s, l] = rgbToHsl(r, g, b)

    // 2. Ignore near-whites, near-blacks, and extremely low-saturation colors
    if (l < 0.12 || l > 0.88 || s < 0.15) continue

    // Quantize HSL to group similar colors
    const hBin = Math.round(h / 15) * 15
    const sBin = Math.round(s * 5) / 5
    const lBin = Math.round(l * 5) / 5
    const binKey = `${hBin}-${sBin}-${lBin}`

    if (!colorBins[binKey]) {
      colorBins[binKey] = { rgb: [r, g, b], count: 0 }
    }
    colorBins[binKey].count++
  }

  const sortedBins = Object.values(colorBins).sort((a, b) => b.count - a.count)

  if (sortedBins.length === 0) {
    return DEFAULT_BRAND_PALETTE
  }

  const primaryRgb = sortedBins[0].rgb
  const rawPrimaryHex = rgbToHex(...primaryRgb)

  // Enforce WCAG AA contrast for text on primary
  const { bgHex: primary_color, textHex: text_on_primary } = ensureWcagContrast(rawPrimaryHex)

  const primRgb = hexToRgb(primary_color)!
  
  // Derive Dark/Light helper primary color shades
  const primary_dark_color = rgbToHex(
    Math.max(0, Math.floor(primRgb[0] * 0.75)),
    Math.max(0, Math.floor(primRgb[1] * 0.75)),
    Math.max(0, Math.floor(primRgb[2] * 0.75))
  )

  const primary_light_color = rgbToHex(
    Math.min(255, Math.floor(primRgb[0] + (255 - primRgb[0]) * 0.85)),
    Math.min(255, Math.floor(primRgb[1] + (255 - primRgb[1]) * 0.85)),
    Math.min(255, Math.floor(primRgb[2] + (255 - primRgb[2]) * 0.85))
  )

  // Derive secondary / accent candidates if available
  const secondaryRgb = sortedBins[1]?.rgb || [Math.max(0, primRgb[0] - 30), Math.max(0, primRgb[1] - 30), Math.max(0, primRgb[2] - 30)]
  const accentRgb = sortedBins[2]?.rgb || [Math.min(255, primRgb[0] + 50), Math.min(255, primRgb[1] + 50), Math.min(255, primRgb[2] - 50)]

  return {
    primary_color,
    primary_dark_color,
    primary_light_color,
    secondary_color: rgbToHex(...secondaryRgb),
    accent_color: rgbToHex(...accentRgb),
    background_color: '#09090B', // safe dark background
    surface_color: '#18181B',    // safe surface color
    text_on_primary,
  }
}

export function isLightColor(hex: string | null | undefined): boolean {
  if (!hex) return false
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  
  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [24, 24, 27] // #18181B
  
  const contrastWithWhite = getContrastRatio(rgb, white)
  const contrastWithBlack = getContrastRatio(rgb, black)
  
  return contrastWithBlack >= contrastWithWhite
}

export interface ResolvedBranding {
  card_text_color: string
  card_muted_text_color: string
  empty_stamp_color: string
  empty_stamp_border_color: string
  primary_color: string
  primary_dark_color: string
  primary_light_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  surface_color: string
  text_on_primary: string
  logo_url?: string | null
  card_background_image_url?: string | null
  card_background_overlay: number
}

export function resolveBrandingColors(
  branding: BusinessBranding | null | undefined,
  isBrandingEnabled: boolean
): ResolvedBranding {
  if (!isBrandingEnabled || !branding) {
    return {
      card_text_color: 'var(--color-text)',
      card_muted_text_color: 'var(--color-text-muted)',
      empty_stamp_color: 'var(--color-elevated)',
      empty_stamp_border_color: 'var(--color-border)',
      primary_color: 'var(--color-gold)',
      primary_dark_color: 'var(--color-gold-dark)',
      primary_light_color: 'var(--color-gold-light)',
      secondary_color: 'var(--color-border)',
      accent_color: 'var(--color-gold)',
      background_color: 'var(--color-bg)',
      surface_color: 'var(--color-surface)',
      text_on_primary: '#000000',
      logo_url: null,
      card_background_image_url: null,
      card_background_overlay: 0.6,
    }
  }

  const surface = branding.surface_color || '#18181B'
  const isLight = isLightColor(surface)

  const rawOverlay =
    typeof branding.card_bg_overlay_opacity === 'number'
      ? Number(branding.card_bg_overlay_opacity)
      : typeof branding.card_background_overlay === 'number'
      ? Number(branding.card_background_overlay)
      : 0.6

  // Ensure overlay is within [0.2, 0.9]
  const card_background_overlay = Math.max(0.2, Math.min(0.9, isNaN(rawOverlay) ? 0.6 : rawOverlay))

  return {
    primary_color: branding.primary_color,
    primary_dark_color: branding.primary_dark_color,
    primary_light_color: branding.primary_light_color,
    secondary_color: branding.secondary_color || (isLight ? '#99BFBD' : '#3F3F46'),
    accent_color: branding.accent_color || branding.primary_color,
    background_color: branding.background_color || (isLight ? '#F9FAFB' : '#09090B'),
    surface_color: surface,
    text_on_primary: branding.text_on_primary,
    logo_url: branding.logo_url || null,
    card_background_image_url: branding.card_background_image_url || null,
    card_background_overlay,
    
    card_text_color: branding.card_text_color || (isLight ? '#111827' : '#F5F5F5'),
    card_muted_text_color: branding.card_muted_text_color || (isLight ? '#6B7280' : '#A1A1AA'),
    empty_stamp_color: branding.empty_stamp_color || (isLight ? '#E7EFEE' : '#18181B'),
    empty_stamp_border_color: branding.empty_stamp_border_color || (isLight ? '#99BFBD' : '#3F3F46'),
  }
}

/**
 * Derives a contrast-safe auto-theme from an uploaded logo image.
 * Updates primary colors and typography while keeping empty stamp slots default/manual.
 */
export function deriveAutoThemeFromLogo(
  imgElement: HTMLImageElement,
  currentSurfaceColor: string = '#18181B'
): {
  primary_color: string
  primary_dark_color: string
  primary_light_color: string
  text_on_primary: string
  accent_color: string
  card_text_color: string
  card_muted_text_color: string
} {
  const extracted = extractPaletteFromImage(imgElement)
  const isLightSurface = isLightColor(currentSurfaceColor)

  return {
    primary_color: extracted.primary_color,
    primary_dark_color: extracted.primary_dark_color,
    primary_light_color: extracted.primary_light_color,
    text_on_primary: extracted.text_on_primary,
    accent_color: extracted.accent_color || extracted.primary_color,
    card_text_color: isLightSurface ? '#111827' : '#F5F5F5',
    card_muted_text_color: isLightSurface ? '#6B7280' : '#A1A1AA',
  }
}

