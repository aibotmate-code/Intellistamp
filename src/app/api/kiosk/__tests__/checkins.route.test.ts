/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

const BIZ_A = '11111111-1111-4000-a000-000000000001'
const BIZ_B = '22222222-2222-4000-a000-000000000002'
const CHK_ID = '33333333-3333-4000-a000-000000000003'

const MERCHANT_A_USER = { id: 'user-merchant-a', email: 'merchanta@example.com' }

const mockBusinessA = {
  id: BIZ_A,
  owner_id: MERCHANT_A_USER.id,
  staff_pin_hash: '$2b$10$mockhash',
  stamps_required: 6,
  reward: 'Free coffee',
  approval_status: 'approved',
  plan_expires_at: null,
}

let mockAuthUser: any = MERCHANT_A_USER
let mockRpcResult: any = null
let mockPendingList: any[] = []

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(async () => {
    if (!mockAuthUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return mockAuthUser
  }),
  requireActiveBusiness: jest.fn(async (userOrError: any, businessId: string) => {
    if (userOrError instanceof NextResponse) return userOrError
    if (businessId === BIZ_A && userOrError.id === MERCHANT_A_USER.id) {
      return mockBusinessA
    }
    // Cross-tenant or non-existent business returns 404 to avoid leaking existence
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBusinessA, error: null }),
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

describe('Kiosk Check-ins API (/api/kiosk/checkins) - Security Requirements D-H', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthUser = MERCHANT_A_USER
    mockPendingList = []
    mockRpcResult = { data: { success: true, stamp_result: { stamp: { id: 'stamp-123' }, total_stamps: 1 } }, error: null }
  })

  // ── D: Unauthenticated GET /api/kiosk/checkins is rejected ─────────────────
  test('D. unauthenticated GET /api/kiosk/checkins is rejected with 401', async () => {
    mockAuthUser = null // No authenticated session

    const req = new NextRequest(`http://localhost/api/kiosk/checkins?businessId=${BIZ_A}`)
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Authentication required')
  })

  // ── E: Merchant A cannot list Merchant B pending requests ─────────────────
  test('E. merchant A cannot list merchant B pending requests (rejected with 404)', async () => {
    mockAuthUser = MERCHANT_A_USER

    // Merchant A attempts to query Business B
    const req = new NextRequest(`http://localhost/api/kiosk/checkins?businessId=${BIZ_B}`)
    const res = await GET(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Business not found')
  })

  // ── F: Merchant A cannot approve Merchant B request ────────────────────────
  test('F. merchant A cannot approve merchant B request (rejected with 404)', async () => {
    mockAuthUser = MERCHANT_A_USER

    const req = new NextRequest('http://localhost/api/kiosk/checkins', {
      method: 'POST',
      body: JSON.stringify({
        business_id: BIZ_B, // Merchant B's business
        checkin_id: CHK_ID,
        pin: '1234',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Business not found')
  })

  // ── G: Correct merchant + wrong PIN rejected ──────────────────────────────
  test('G. correct merchant + wrong PIN rejected with 400', async () => {
    mockAuthUser = MERCHANT_A_USER

    const req = new NextRequest('http://localhost/api/kiosk/checkins', {
      method: 'POST',
      body: JSON.stringify({
        business_id: BIZ_A,
        checkin_id: CHK_ID,
        pin: '9999', // wrong PIN
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid staff PIN')
  })

  // ── H: Correct merchant + correct PIN succeeds ────────────────────────────
  test('H. correct merchant + correct PIN succeeds with 200', async () => {
    mockAuthUser = MERCHANT_A_USER

    const req = new NextRequest('http://localhost/api/kiosk/checkins', {
      method: 'POST',
      body: JSON.stringify({
        business_id: BIZ_A,
        checkin_id: CHK_ID,
        pin: '1234', // correct PIN
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.result.stamp.id).toBe('stamp-123')
  })

  test('GET: returns pending check-ins for authorized merchant', async () => {
    mockAuthUser = MERCHANT_A_USER
    mockPendingList = [
      {
        id: CHK_ID,
        business_id: BIZ_A,
        customer_id: 'cust-1',
        status: 'pending',
        customers: { phone: '9876543210', name: 'Test User' },
      },
    ]

    const req = new NextRequest(`http://localhost/api/kiosk/checkins?businessId=${BIZ_A}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.checkins).toHaveLength(1)
    expect(data.checkins[0].id).toBe(CHK_ID)
  })
})
