/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { generateToken } from '@/lib/token'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockQueue: any[] = []

function dequeue() {
  return mockQueue.shift() ?? { data: null, error: null }
}

// Build a single chainable mock object that is also thenable (for direct awaits)
const mockChain: any = {
  from: jest.fn().mockReturnThis(),
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

// Queue a full successful stamp flow (mid-card, no completion, no milestone)
function queueSuccessfulStamp(stampCount = 1) {
  // 1. businesses.single()
  mockQueue.push({ data: mockBusiness, error: null })
  // 2. recent stamps.single() → null (no recent stamp)
  mockQueue.push({ data: null, error: { code: 'PGRST116' } })
  // 3. business_customers.upsert (direct await via .then)
  mockQueue.push({ data: null, error: null })
  // 4. stamps.insert.single()
  mockQueue.push({ data: mockStamp, error: null })
  // 5. stamps count (direct await via .then)
  mockQueue.push({ count: stampCount, data: null, error: null })
  // 6. milestones (direct await via .then, via Promise.all)
  mockQueue.push({ data: [], error: null })
  // 7. milestone_claims (direct await via .then, via Promise.all)
  mockQueue.push({ data: [], error: null })
}

// ---------------------------------------------------------------------------
// Import the route handler after mocks are set up
// ---------------------------------------------------------------------------

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
    const token = generateToken(BIZ_ID, 0)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.stamp).toBeDefined()
  })

  test('stamp within cooldown → 429 with cooldown_hours', async () => {
    mockQueue.push({ data: mockBusiness, error: null })
    // Recent stamp 1 hour ago → still within 4-hour cooldown
    mockQueue.push({
      data: { stamped_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      error: null,
    })
    const token = generateToken(BIZ_ID, 0)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.cooldown_hours).toBeGreaterThan(0)
  })

  test('stamp after cooldown → 200 success', async () => {
    queueSuccessfulStamp(2)
    const token = generateToken(BIZ_ID, 0)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  test('replay attack — same token same customer → 409', async () => {
    mockQueue.push({ data: mockBusiness, error: null })            // business
    mockQueue.push({ data: null, error: { code: 'PGRST116' } })   // no recent stamp
    mockQueue.push({ data: null, error: null })                    // upsert
    mockQueue.push({ data: null, error: { code: '23505' } })      // stamp INSERT → unique violation

    const token = generateToken(BIZ_ID, 0)
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
    const tokenForBizA = generateToken(BIZ_ID, 0) // valid for BIZ_ID, not OTHER_BIZ
    const req = makeRequest({ customer_id: CUST_ID, business_id: OTHER_BIZ, token: tokenForBizA })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('reward_result null when no completion (mid-card stamp)', async () => {
    queueSuccessfulStamp(3) // 3 of 6 — no completion
    const token = generateToken(BIZ_ID, 0)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    const body = await res.json()
    expect(body.reward_result).toBeNull()
  })

  test('reward_result.type=stamp when card completes', async () => {
    // Queue: 6 stamps → card complete
    mockQueue.push({ data: mockBusiness, error: null })           // business
    mockQueue.push({ data: null, error: { code: 'PGRST116' } })  // no recent stamp
    mockQueue.push({ data: null, error: null })                   // upsert
    mockQueue.push({ data: mockStamp, error: null })              // insert stamp
    mockQueue.push({ count: 6, data: null, error: null })         // count = 6 → complete
    mockQueue.push({ data: [], error: null })                     // no milestones
    mockQueue.push({ data: [], error: null })                     // no claims

    const token = generateToken(BIZ_ID, 0)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    const body = await res.json()
    expect(body.reward_result?.type).toBe('stamp')
  })

  test('reward_result.type=milestone when milestone hit', async () => {
    // Queue: 3 stamps → not complete, but milestone at visit 3
    mockQueue.push({ data: mockBusiness, error: null })
    mockQueue.push({ data: null, error: { code: 'PGRST116' } })
    mockQueue.push({ data: null, error: null })                      // upsert
    mockQueue.push({ data: mockStamp, error: null })                 // insert
    mockQueue.push({ count: 3, data: null, error: null })            // count = 3
    mockQueue.push({ data: [mockMilestone], error: null })           // eligible milestone
    mockQueue.push({ data: [], error: null })                        // no prior claims
    mockQueue.push({ data: null, error: null })                      // claimMilestone insert

    const token = generateToken(BIZ_ID, 0)
    const req = makeRequest({ customer_id: CUST_ID, business_id: BIZ_ID, token })
    const res = await POST(req)
    const body = await res.json()
    expect(body.reward_result?.type).toBe('milestone')
  })
})
