import { NextRequest } from 'next/server'
import { GET as profileHandler } from '../profile/route'

jest.mock('@supabase/supabase-js', () => {
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockSingle = jest.fn()
  const mockOrder = jest.fn()
  
  const mockSupabase = {
    from: jest.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    })),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn((path) => ({ data: { publicUrl: `https://mock.storage/${path}` } }))
      }))
    }
  }

  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder, select: mockSelect })
  mockOrder.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder, select: mockSelect })

  return {
    createClient: () => mockSupabase,
    __mocks: { mockSelect, mockEq, mockSingle, mockOrder }
  }
})

// @ts-expect-error Mocked module injection
import { __mocks as smocks } from '@supabase/supabase-js'

describe('Profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const makeReq = (query: string) => new NextRequest(`http://localhost/api/customer/profile?${query}`, { method: 'GET' })

  test('returns branding data when available', async () => {
    // 1. Customer
    smocks.mockSingle.mockResolvedValueOnce({ data: { id: 'c1', phone: '9000000000' } })
    // 2. Enrollments
    smocks.mockOrder.mockResolvedValueOnce({
      data: [
        {
          customer_id: 'c1',
          business_id: 'b1',
          business: {
            id: 'b1',
            stamps_required: 10,
            branding: {
              logo_path: 'b1/logo.png',
              is_enabled: true
            }
          }
        }
      ]
    })
    // 3. Stamps
    smocks.mockOrder.mockResolvedValueOnce({ data: [] })

    const res = await profileHandler(makeReq('phone=9000000000'))
    const data = await res.json()

    expect(data.cards[0].business.branding).toBeDefined()
    expect(data.cards[0].business.branding.logo_url).toBe('https://mock.storage/b1/logo.png')
  })

  test('falls back safely when branding is null', async () => {
    // 1. Customer
    smocks.mockSingle.mockResolvedValueOnce({ data: { id: 'c1', phone: '9000000000' } })
    // 2. Enrollments
    smocks.mockOrder.mockResolvedValueOnce({
      data: [
        {
          customer_id: 'c1',
          business_id: 'b2',
          business: {
            id: 'b2',
            stamps_required: 10,
            branding: null
          }
        }
      ]
    })
    // 3. Stamps
    smocks.mockOrder.mockResolvedValueOnce({ data: [] })

    const res = await profileHandler(makeReq('phone=9000000000'))
    const data = await res.json()

    expect(data.cards[0].business.branding).toBeNull()
  })
})
