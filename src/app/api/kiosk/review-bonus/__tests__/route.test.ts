/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { hashPin } from '@/lib/pinHash'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  peekRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  resetRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn().mockReturnValue(new Response('Rate limit', { status: 429 })),
  rateLimitErrorResponse: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn((prefix, val) => 'mock_hash')
}))

let mockQueue: any[] = []

function dequeue() {
  return mockQueue.shift() ?? { data: null, error: null }
}

const mockChain: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(() => Promise.resolve(dequeue())),
  single: jest.fn(() => Promise.resolve(dequeue())),
  then(resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockChain),
}))

// ---------------------------------------------------------------------------
// Import handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../route')

const BIZ_ID = '00000000-0000-4000-a000-000000000001'
const CUST_ID = '00000000-0000-4000-b000-000000000002'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
})

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
})

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/kiosk/review-bonus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/kiosk/review-bonus', () => {
  test('returns 400 if validation fails', async () => {
    const req = makeRequest({ business_id: BIZ_ID, customer_id: CUST_ID, pin: '12' })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  test('returns 404 if business not found', async () => {
    mockQueue.push({ data: null, error: { message: 'Not found' } }) // business query
    const req = makeRequest({ business_id: BIZ_ID, customer_id: CUST_ID, pin: '1234' })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(404)
    expect(data.error).toBe('Business not found')
  })


  test('validates correct hashed bcrypt PIN', async () => {
    const pinHash = await hashPin('4321')
    // 1. Business query
    mockQueue.push({
      data: {
        staff_pin: 'legacy-ignored',
        staff_pin_hash: pinHash,
        stamps_required: 10,
        gmb_link: 'http://g.co/review',
      },
    })
    // 2. Review claimed check
    mockQueue.push({ data: null })
    // 3. Stamp insert
    mockQueue.push({ data: { id: 'stamp-1' } })
    // 4. Update review_claimed
    mockQueue.push({ data: {} })
    // 5. Select stamp count
    mockQueue.push({ count: 3 })

    const req = makeRequest({ business_id: BIZ_ID, customer_id: CUST_ID, pin: '4321' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.card_state.total_stamps).toBe(3)
  })

  test('rejects wrong hashed bcrypt PIN', async () => {
    const pinHash = await hashPin('4321')
    // 1. Business query
    mockQueue.push({
      data: {
        staff_pin: 'legacy-ignored',
        staff_pin_hash: pinHash,
        stamps_required: 10,
        gmb_link: 'http://g.co/review',
      },
    })

    const req = makeRequest({ business_id: BIZ_ID, customer_id: CUST_ID, pin: '1111' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid PIN')
  })
})
