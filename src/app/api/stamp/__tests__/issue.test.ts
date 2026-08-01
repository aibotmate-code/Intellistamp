/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
process.env.QR_SECRET_KEY = 'test-secret-12345678901234567890123456789012'
import { generateServerToken } from '@/lib/server/token'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockQueue: any[] = []

function dequeue() {
  return mockQueue.shift() ?? { data: null, error: null }
}

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn().mockReturnValue(new Response('Rate limit', { status: 429 })),
  rateLimitErrorResponse: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn((prefix, val) => 'mock_hash')
}))

// Build a single chainable mock object that is also thenable (for direct awaits)
const mockChain: any = {
  from: jest.fn().mockReturnThis(),
  rpc: jest.fn(() => Promise.resolve(dequeue())),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(() => Promise.resolve(dequeue())),
  maybeSingle: jest.fn(() => Promise.resolve(dequeue())),
  // then makes it awaitable directly (e.g. upsert, count query, milestones)
  then(resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockChain),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BIZ_ID = '00000000-0000-4000-a000-000000000001'
const CUST_ID = '00000000-0000-4000-a000-000000000002'

const mockBusiness = {
  id: BIZ_ID,
  name: 'Test Cafe',
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: true,
  staff_pin_enabled: false,
  staff_pin: '1234',
  conflict_priority: 'stamp',
}

const mockStamp = {
  id: 'stamp-id-1',
  customer_id: CUST_ID,
  business_id: BIZ_ID,
  type: 'regular',
  stamped_at: new Date().toISOString(),
}

const mockMilestone = {
  id: 'milestone-1',
  business_id: BIZ_ID,
  visit_number: 3,
  badge: '🥈 Silver',
  reward: 'Free latte',
  is_active: true,
}

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/stamp/issue', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function queueSuccessfulStamp(stampCount = 1, completes = false, milestoneHit = false) {
  // 1. businesses.single()
  mockQueue.push({ data: mockBusiness, error: null })
  
  // 2. issue_stamp_atomic rpc
  const mockRpcResult = {
    total_stamps: stampCount,
    stamp: mockStamp,
    reward_result: milestoneHit ? { type: 'milestone', badge: 'Silver' } : 
                   completes ? { type: 'stamp' } : null
  }
  mockQueue.push({ data: mockRpcResult, error: null })
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../issue/route')

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
  mockChain.from.mockReturnThis()
  mockChain.select.mockReturnThis()
  mockChain.insert.mockReturnThis()
  mockChain.update.mockReturnThis()
  mockChain.upsert.mockReturnThis()
  mockChain.delete.mockReturnThis()
  mockChain.eq.mockReturnThis()
  mockChain.neq.mockReturnThis()
  mockChain.lte.mockReturnThis()
  mockChain.gte.mockReturnThis()
  mockChain.order.mockReturnThis()
  mockChain.limit.mockReturnThis()
  mockChain.single.mockImplementation(() => Promise.resolve(dequeue()))
  mockChain.maybeSingle.mockImplementation(() => Promise.resolve(dequeue()))
  mockChain.then = function (resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/stamp/issue', () => {
  test('missing business_id → 400 error', async () => {
    const req = makeRequest({ customer_id: CUST_ID, token: 'ABCDEF' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test('missing customer_id → 400 error', async () => {
    const req = makeRequest({ business_id: BIZ_ID, token: 'ABCDEF' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('invalid token → 401 error', async () => {
    mockQueue.push({ data: mockBusiness, error: null })
    const req = makeRequest({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      token: 'ZZZZZZ', // deliberately wrong
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('valid token → 200 with stamp object', async () => {
    queueSuccessfulStamp(1)
    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.stamp).toBeDefined()
  })

  test('stamp within cooldown → 429 with cooldown_hours', async () => {
    mockQueue.push({ data: mockBusiness, error: null })
    mockQueue.push({ data: { error: 'cooldown', hours_left: 3 }, error: null })
    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.cooldown_hours).toBeGreaterThan(0)
  })

  test('stamp after cooldown → 200 success', async () => {
    queueSuccessfulStamp(2)
    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  test('replay attack — same token same customer → 409', async () => {
    mockQueue.push({ data: mockBusiness, error: null })
    mockQueue.push({ data: { error: 'token_used' }, error: null })

    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('already used')
  })

  test('cross-business stamp attempt → 401 error', async () => {
    // Token generated for BIZ_ID but request sent for a different business
    const OTHER_BIZ = '99999999-9999-4999-a999-999999999999'
    mockQueue.push({
      data: { ...mockBusiness, id: OTHER_BIZ, dynamic_qr_enabled: true },
      error: null,
    })
    const tokenForBizA = generateServerToken(BIZ_ID) // valid for BIZ_ID, not OTHER_BIZ
    const req = makeRequest({ customer_id: CUST_ID, business_id: OTHER_BIZ, token: tokenForBizA })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('reward_result null when no completion (mid-card stamp)', async () => {
    queueSuccessfulStamp(3) // 3 of 6 — no completion
    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    const body = await res.json()
    expect(body.reward_result).toBeNull()
  })

  test('reward_result.type=stamp when card completes', async () => {
    // Queue: 6 stamps → card complete
    queueSuccessfulStamp(6, true, false)

    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    const body = await res.json()
    expect(body.reward_result?.type).toBe('stamp')
  })

  test('reward_result.type=milestone when milestone hit', async () => {
    // Queue: 3 stamps → not complete, but milestone at visit 3
    queueSuccessfulStamp(3, false, true)

    const token = generateServerToken(BIZ_ID)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    const body = await res.json()
    expect(body.reward_result?.type).toBe('milestone')
  })
})
