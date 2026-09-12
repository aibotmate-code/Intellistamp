import { NextRequest } from 'next/server'
import { GET as cardAccessHandler } from '../card-access/route'

const BIZ_ID = '550e8400-e29b-41d4-a716-446655440000'
const CUST_ID = '660e8400-e29b-41d4-a716-446655440000'

jest.mock('@/lib/server/grant', () => ({
  validateAccessGrant: jest.fn(() => CUST_ID),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn((name: string) => ({ value: `grant_${name}` })),
  })),
}))

const mockCustomerRow: Record<string, unknown> = { id: CUST_ID, name: 'Rahul', phone: '9876543210', created_at: '2026-01-01' }
const mockBusinessRow: Record<string, unknown> = {
  stamps_required: 10,
  reward: 'Free Coffee',
  name: 'Coffea Cafe',
  emoji: '☕',
  hide_reward_details: true,
  branding: {
    business_id: BIZ_ID,
    logo_path: 'biz-1/logo.png',
    card_bg_image_path: 'biz-1/bg.jpg',
    card_bg_overlay_opacity: 0.7,
    primary_color: '#3A7874',
    primary_dark_color: '#2A5855',
    primary_light_color: '#E0EDED',
    text_on_primary: '#FFFFFF',
    is_enabled: true,
    hidden_reward_text: 'Surprise Coffee',
  },
}

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: jest.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockCustomerRow, error: null }),
          }
        }
        if (table === 'stamps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: (value: unknown) => unknown) => resolve({ count: 3, data: null, error: null }),
          }
        }
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBusinessRow, error: null }),
          }
        }
        if (table === 'business_customers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { cards_redeemed: 0 }, error: null }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
      storage: {
        from: jest.fn().mockReturnValue({
          getPublicUrl: jest.fn((path: string) => ({
            data: { publicUrl: `https://storage.mock.test/branding/${path}` },
          })),
        }),
      },
    }),
  }
})

describe('GET /api/customer/card-access branding completeness', () => {
  test('returns background image, overlay opacity, logo, and colors in branding payload', async () => {
    const req = new NextRequest(`http://localhost/api/customer/card-access?bizId=${BIZ_ID}`)
    const res = await cardAccessHandler(req)
    expect(res.status).toBe(200)

    // Check no-store header
    expect(res.headers.get('Cache-Control')).toContain('no-store')

    const data = await res.json()
    expect(data.business).toBeDefined()
    expect(data.business.name).toBe('Coffea Cafe')

    const branding = data.business.branding
    expect(branding).toBeDefined()
    expect(branding.logo_url).toBe('https://storage.mock.test/branding/biz-1/logo.png')
    expect(branding.card_background_image_url).toBe('https://storage.mock.test/branding/biz-1/bg.jpg')
    expect(branding.card_background_overlay).toBe(0.7)
    expect(branding.primary_color).toBe('#3A7874')
    expect(branding.text_on_primary).toBe('#FFFFFF')
    expect(branding.is_enabled).toBe(true)
    expect(branding.hidden_reward_text).toBe('Surprise Coffee')
  })
})
