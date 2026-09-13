/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

const BIZ_ID = '11111111-1111-4000-a000-000000000001'
const OTHER_BIZ_ID = '22222222-2222-4000-a000-000000000002'
const CHK_ID = '33333333-3333-4000-a000-000000000003'

const mockBusiness = {
  id: BIZ_ID,
  staff_pin_hash: '$2b$10$mockhash',
  stamps_required: 6,
  reward: 'Free coffee',
  approval_status: 'approved',
  plan_expires_at: null,
}

let mockRpcResult: any = null
let mockPendingList: any[] = []

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBusiness, error: null }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPendingList, error: null }),
      }
    }),
    rpc: jest.fn(() => Promise.resolve(mockRpcResult)),
  })),
}))

jest.mock('@/lib/pinHash', () => ({
  verifyPin: jest.fn((pin: string) => Promise.resolve(pin === '1234')),
}))

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  peekRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  resetRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn(),
  rateLimitErrorResponse: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn(() => 'mock_identity'),
}))

// Import route handlers
import { GET, POST } from '../checkins/route'

describe('Kiosk Check-ins API (/api/kiosk/checkins)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPendingList = []
    mockRpcResult = { data: { success: true, stamp_result: { id: 'stamp-123' } }, error: null }
  })

  test('GET: returns pending check-ins for the business', async () => {
    mockPendingList = [
      {
        id: CHK_ID,
        business_id: BIZ_ID,
        customer_id: 'cust-1',
        status: 'pending',
        customers: { phone: '9876543210', name: 'Test User' },
      },
    ]

    const req = new NextRequest(`http://localhost/api/kiosk/checkins?businessId=${BIZ_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.checkins).toHaveLength(1)
    expect(data.checkins[0].id).toBe(CHK_ID)
  })

  test('POST: rejects with 400 when staff PIN is incorrect', async () => {
    const req = new NextRequest('http://localhost/api/kiosk/checkins', {
      method: 'POST',
      body: JSON.stringify({
        business_id: BIZ_ID,
        checkin_id: CHK_ID,
        pin: '0000', // incorrect
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid staff PIN')
  })

  test('POST: succeeds with 200 when staff PIN is correct', async () => {
    const req = new NextRequest('http://localhost/api/kiosk/checkins', {
      method: 'POST',
      body: JSON.stringify({
        business_id: BIZ_ID,
        checkin_id: CHK_ID,
        pin: '1234',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.result.id).toBe('stamp-123')
  })

  test('POST: rejects with 404 when check-in belongs to another business', async () => {
    mockRpcResult = { data: { error: 'not_found' }, error: null }

    const req = new NextRequest('http://localhost/api/kiosk/checkins', {
      method: 'POST',
      body: JSON.stringify({
        business_id: OTHER_BIZ_ID,
        checkin_id: CHK_ID,
        pin: '1234',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('not found')
  })
})
