import {
  getContrastRatio,
  ensureWcagContrast,
  isLightColor,
  resolveBrandingColors,
} from '../palette'
import type { BusinessBranding } from '@/types'

describe('Palette & Contrast Utilities', () => {
  describe('getLuminance & getContrastRatio', () => {
    test('pure white vs pure black ratio is ~21:1', () => {
      const white: [number, number, number] = [255, 255, 255]
      const black: [number, number, number] = [0, 0, 0]
      const ratio = getContrastRatio(white, black)
      expect(ratio).toBeGreaterThanOrEqual(20.9)
      expect(ratio).toBeLessThanOrEqual(21.1)
    })

    test('identical colors have 1:1 ratio', () => {
      const color: [number, number, number] = [128, 128, 128]
      expect(getContrastRatio(color, color)).toBe(1)
    })
  })

  describe('isLightColor', () => {
    test('identifies light vs dark backgrounds', () => {
      expect(isLightColor('#FFFFFF')).toBe(true)
      expect(isLightColor('#F9FAFB')).toBe(true)
      expect(isLightColor('#FEF08A')).toBe(true)
      expect(isLightColor('#09090B')).toBe(false)
      expect(isLightColor('#18181B')).toBe(false)
      expect(isLightColor('#1E293B')).toBe(false)
    })
  })

  describe('ensureWcagContrast', () => {
    test('light gold/yellow returns dark text', () => {
      const { textHex } = ensureWcagContrast('#FACC15')
      expect(textHex).toBe('#18181B')
    })

    test('dark teal/navy returns white text', () => {
      const { textHex } = ensureWcagContrast('#0F172A')
      expect(textHex).toBe('#FFFFFF')
    })
  })

  describe('resolveBrandingColors', () => {
    test('disabled branding returns fallback system variables', () => {
      const res = resolveBrandingColors(null, false)
      expect(res.primary_color).toBe('var(--color-gold)')
      expect(res.surface_color).toBe('var(--color-surface)')
      expect(res.card_background_image_url).toBeNull()
      expect(res.card_background_overlay).toBe(0.6)
    })

    test('enabled branding resolves custom colors and pattern with bounded overlay', () => {
      const branding: BusinessBranding = {
        business_id: 'biz-123',
        is_enabled: true,
        primary_color: '#3B82F6',
        primary_dark_color: '#1D4ED8',
        primary_light_color: '#DBEAFE',
        text_on_primary: '#FFFFFF',
        surface_color: '#18181B',
        card_background_image_url: 'https://example.com/pattern.png',
        card_bg_overlay_opacity: 0.75,
      }

      const res = resolveBrandingColors(branding, true)
      expect(res.primary_color).toBe('#3B82F6')
      expect(res.card_background_image_url).toBe('https://example.com/pattern.png')
      expect(res.card_background_overlay).toBe(0.75)
      expect(res.card_text_color).toBe('#F5F5F5')
      expect(res.empty_stamp_color).toBe('#18181B')
    })

    test('clamps overlay opacity between 0.2 and 0.9', () => {
      const brandingLow: BusinessBranding = {
        business_id: 'biz-123',
        is_enabled: true,
        primary_color: '#3B82F6',
        primary_dark_color: '#1D4ED8',
        primary_light_color: '#DBEAFE',
        text_on_primary: '#FFFFFF',
        card_bg_overlay_opacity: 0.05,
      }
      const resLow = resolveBrandingColors(brandingLow, true)
      expect(resLow.card_background_overlay).toBe(0.2)

      const brandingHigh: BusinessBranding = {
        business_id: 'biz-123',
        is_enabled: true,
        primary_color: '#3B82F6',
        primary_dark_color: '#1D4ED8',
        primary_light_color: '#DBEAFE',
        text_on_primary: '#FFFFFF',
        card_bg_overlay_opacity: 0.99,
      }
      const resHigh = resolveBrandingColors(brandingHigh, true)
      expect(resHigh.card_background_overlay).toBe(0.9)
    })
  })
})
