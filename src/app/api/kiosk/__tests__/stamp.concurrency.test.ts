import { NextRequest } from 'next/server'
import { POST } from '../stamp/route'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js', () => {
  const mockInsert = jest.fn()
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockOrder = jest.fn()
  const mockLimit = jest.fn()
   
  const mockSingle = jest.fn()
  const mockMaybeSingle = jest.fn()
  const mockUpsert = jest.fn()

  const mockSupabase = {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
    })),
  }

  // Setup chains
  mockSelect.mockReturnValue({ eq: mockEq })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle, maybeSingle: mockMaybeSingle, limit: mockLimit, lte: mockEq, then: (res: any) => Promise.resolve({ data: [], count: 5 }).then(res) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockOrder.mockReturnValue({ limit: mockLimit, then: (res: any) => Promise.resolve({ data: [] }).then(res) })
  mockLimit.mockReturnValue({ single: mockSingle })
  
  mockInsert.mockReturnValue({ select: mockSelect })
  mockUpsert.mockReturnValue({ select: mockSelect })
  // select already returns { eq, etc }, but insert().select().single() needs single on select's return
  // I will just make select return an object with both eq and single
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })

  mockMaybeSingle.mockResolvedValue({ data: null }) // no recent stamp

  return {
    createClient: () => mockSupabase,
    __mocks: { mockInsert, mockSelect, mockEq, mockSingle, mockUpsert, mockMaybeSingle }
  }
})

jest.mock('@/lib/pinHash', () => ({
  verifyPin: jest.fn().mockResolvedValue(true)
}))

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  peekRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  resetRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn(),
  rateLimitErrorResponse: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn((prefix, val) => 'mock_hash')
}))

// @ts-expect-error Mocked module injection
import { __mocks as smocks } from '@supabase/supabase-js'

describe('Concurrency Test - Kiosk Manual Stamping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // In Promise.all for business and customer lookup:
    // First call (business): returns business data
    // Second call (customer): returns customer data
    // Third call (lastStamp lookup): returns null (no cooldown)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    smocks.mockSingle.mockImplementation(async function(this: any) {
      // It's hard to know the table, so we just return valid objects for everything
      // The test only checks if insert was called twice.
      // We can return an object that satisfies all properties:
      return {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000', // valid uuid for business and customer
          staff_pin: '1234',
          staff_pin_hash: 'hash',
          stamps_required: 10,
          phone: '9000000000'
        },
        count: 5
      }
    })
  })

  test('prove race condition on manual stamping', async () => {
    const makeReq = () => new NextRequest('http://localhost/api/kiosk/stamp', {
      method: 'POST',
      body: JSON.stringify({
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        phone: '9000000000',
        pin: '1234'
      })
    })

    const req1 = makeReq()
    const req2 = makeReq()

    const [res1, res2] = await Promise.all([
      POST(req1),
      POST(req2)
    ])

    const json1 = await res1.json()
    const json2 = await res2.json()
    
    // Wait for promise all
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    
    // And insert should have been called twice!
    expect(smocks.mockInsert).toHaveBeenCalledTimes(2)
  })
})
