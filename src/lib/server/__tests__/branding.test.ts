import { mapServerBranding, type StorageUrlProvider } from '../branding'

describe('mapServerBranding', () => {
  const mockStorage: StorageUrlProvider = {
    from: jest.fn().mockReturnValue({
      getPublicUrl: jest.fn((path: string) => ({
        data: { publicUrl: `https://storage.mock.test/branding/${path}` },
      })),
    }),
  }

  test('returns null for null or undefined input', () => {
    expect(mapServerBranding(null, mockStorage)).toBeNull()
    expect(mapServerBranding(undefined, mockStorage)).toBeNull()
    expect(mapServerBranding([], mockStorage)).toBeNull()
  })

  test('maps logo and background image URLs when paths exist', () => {
    const raw = {
      business_id: 'biz-123',
      logo_path: 'biz-123/logo.png',
      card_bg_image_path: 'biz-123/bg.jpg',
      card_bg_overlay_opacity: 0.75,
      primary_color: '#3A7874',
      primary_dark_color: '#2A5855',
      primary_light_color: '#E0EDED',
      text_on_primary: '#FFFFFF',
      is_enabled: true,
      hidden_reward_text: 'Surprise Gift',
      hide_reward_details: true,
    }

    const mapped = mapServerBranding(raw, mockStorage)
    expect(mapped).not.toBeNull()
    expect(mapped?.logo_url).toBe('https://storage.mock.test/branding/biz-123/logo.png')
    expect(mapped?.card_background_image_url).toBe('https://storage.mock.test/branding/biz-123/bg.jpg')
    expect(mapped?.card_background_overlay).toBe(0.75)
    expect(mapped?.primary_color).toBe('#3A7874')
    expect(mapped?.hidden_reward_text).toBe('Surprise Gift')
    expect(mapped?.hide_reward_details).toBe(true)
  })

  test('handles null image paths gracefully', () => {
    const raw = {
      business_id: 'biz-123',
      logo_path: null,
      card_bg_image_path: null,
      primary_color: '#000000',
      primary_dark_color: '#000000',
      primary_light_color: '#FFFFFF',
      text_on_primary: '#FFFFFF',
      is_enabled: false,
    }

    const mapped = mapServerBranding(raw, mockStorage)
    expect(mapped).not.toBeNull()
    expect(mapped?.logo_url).toBeNull()
    expect(mapped?.card_background_image_url).toBeNull()
    expect(mapped?.card_background_overlay).toBe(0.6) // default fallback
  })

  test('clamps overlay opacity between 0.2 and 0.9', () => {
    const tooLow = mapServerBranding(
      { card_bg_overlay_opacity: 0.05, primary_color: '#000', primary_dark_color: '#000', primary_light_color: '#fff', text_on_primary: '#fff', is_enabled: true },
      mockStorage
    )
    expect(tooLow?.card_background_overlay).toBe(0.2)

    const tooHigh = mapServerBranding(
      { card_bg_overlay_opacity: 1.5, primary_color: '#000', primary_dark_color: '#000', primary_light_color: '#fff', text_on_primary: '#fff', is_enabled: true },
      mockStorage
    )
    expect(tooHigh?.card_background_overlay).toBe(0.9)
  })

  test('handles array relation from Supabase join', () => {
    const rawArray = [
      {
        business_id: 'biz-join',
        logo_path: 'biz-join/logo.png',
        primary_color: '#123456',
        primary_dark_color: '#000000',
        primary_light_color: '#ffffff',
        text_on_primary: '#ffffff',
        is_enabled: true,
      },
    ]

    const mapped = mapServerBranding(rawArray, mockStorage)
    expect(mapped).not.toBeNull()
    expect(mapped?.business_id).toBe('biz-join')
    expect(mapped?.logo_url).toBe('https://storage.mock.test/branding/biz-join/logo.png')
  })
})
