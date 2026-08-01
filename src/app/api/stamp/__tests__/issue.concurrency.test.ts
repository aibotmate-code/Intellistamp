import { NextRequest } from 'next/server'
import { POST } from '../issue/route'

jest.mock('@supabase/supabase-js', () => {
  const mockRpc = jest.fn()
  const mockSingle = jest.fn()
  const mockEq = jest.fn()
  const mockSelect = jest.fn()
  
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })

  const mockSupabase = {
    from: jest.fn(() => ({ select: mockSelect })),
    rpc: mockRpc,
  }
  return {
    createClient: () => mockSupabase,
    __mocks: { mockRpc, mockSingle }
  }
})

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn().mockReturnValue(new Response('Rate limit', { status: 429 })),
  rateLimitErrorResponse: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn((prefix, val) => 'mock_hash')
}))

// @ts-expect-error Mocked module injection
import { __mocks as smocks } from '@supabase/supabase-js'

const VALID_BIZ = '550e8400-e29b-41d4-a716-446655440000'
const VALID_CUST = '550e8400-e29b-41d4-a716-446655440001'

describe('Concurrency Test - Manual Stamping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    smocks.mockSingle.mockResolvedValue({ 
      data: { 
        id: VALID_BIZ, 
        dynamic_qr_enabled: false, 
        staff_pin_enabled: false, 
        stamps_required: 10 
      }, 
      error: null 
    })
  })

  test('proves that the atomic RPC is called to prevent race conditions', async () => {
    const req = new NextRequest('http://localhost/api/stamp/issue', {
      method: 'POST',
      body: JSON.stringify({
        business_id: VALID_BIZ,
        customer_id: VALID_CUST,
        staff_pin: '1234'
      })
    })

    smocks.mockRpc.mockResolvedValueOnce({ 
      data: { 
        stamp: { id: 's1' },
        total_stamps: 1,
        reward_result: null
      }, 
      error: null 
    })

    const res = await POST(req)
    if (res.status === 400) {
      console.log('400 Error:', await res.clone().json())
    }
    expect(res.status).toBe(200)
    
    // Verify RPC was used instead of insert
    expect(smocks.mockRpc).toHaveBeenCalledWith('issue_stamp_atomic', expect.objectContaining({
      p_business_id: VALID_BIZ,
      p_customer_id: VALID_CUST
    }))
  })

  test('handles atomic cooldown correctly from DB', async () => {
    const req = new NextRequest('http://localhost/api/stamp/issue', {
      method: 'POST',
      body: JSON.stringify({
        business_id: VALID_BIZ,
        customer_id: VALID_CUST,
        staff_pin: '1234'
      })
    })

    // Simulate DB returning cooldown
    smocks.mockRpc.mockResolvedValueOnce({ 
      data: { error: 'cooldown', hours_left: 3 }, 
      error: null 
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toContain('3h')
  })
})
