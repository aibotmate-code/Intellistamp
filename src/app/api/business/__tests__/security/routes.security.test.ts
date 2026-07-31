/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Security tests covering the containment fixes applied in the security audit.
 * Each test verifies a specific security property rather than functionality.
 */
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockQueue: any[] = []

function dequeue() {
  return mockQueue.shift() ?? { data: null, error: null }
}

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
  gt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  head: jest.fn().mockReturnThis(),
  single: jest.fn(() => Promise.resolve(dequeue())),
  maybeSingle: jest.fn(() => Promise.resolve(dequeue())),
  then(resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockChain),
}))

// ---------------------------------------------------------------------------
// Auth helpers + cookies mock
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn()

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [] })),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_ID   = '00000000-0000-4000-a000-000000000003'
const OTHER_ID   = '11111111-0000-4000-a000-000000000099'
const BIZ_ID     = '00000000-0000-4000-a000-000000000001'
const CUST_ID    = '00000000-0000-4000-a000-000000000002'
const CUST_TOKEN = 'aaaaaaaa-0000-4000-a000-000000000010'

const mockBusiness = {
  id: BIZ_ID,
  name: 'Test Cafe',
  slug: 'test-cafe',
  emoji: '☕',
  category: 'Cafe',
  stamps_required: 6,
  reward: 'Free coffee',
  gmb_link: null,
  dynamic_qr_enabled: true,
  staff_pin_enabled: false,
  staff_pin: '1234',
  staff_pin_hash: null,
  whatsapp_enabled: false,
  plan: 'free',
  conflict_priority: 'stamp',
  owner_id: OWNER_ID,
  owner_phone: '9876543210',
  created_at: new Date().toISOString(),
}

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

function makePatch(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makePost(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockSession(userId = OWNER_ID) {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: userId, email: 'owner@example.com' } } },
  })
}

function mockNoSession() {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } })
}

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
  // mockResolvedValueOnce queues are NOT cleared by clearAllMocks — reset explicitly
  // so residual queued values from schema-rejection tests (which skip auth) don't bleed through
  mockGetSession.mockReset()
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
  mockChain.gt.mockReturnThis()
  mockChain.order.mockReturnThis()
  mockChain.limit.mockReturnThis()
  mockChain.head.mockReturnThis()
  mockChain.single.mockImplementation(() => Promise.resolve(dequeue()))
  mockChain.maybeSingle.mockImplementation(() => Promise.resolve(dequeue()))
  mockChain.then = function (resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  }
})

// ---------------------------------------------------------------------------
// GET /api/business/get — auth required
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getBusinessHandler } = require('../../get/route')

describe('GET /api/business/get — auth security', () => {
  test('no session → 401', async () => {
    mockNoSession()
    const res = await getBusinessHandler(makeGet(`http://localhost/api/business/get?ownerId=${OWNER_ID}`))
    expect(res.status).toBe(401)
  })

  test('missing ownerId param → 400', async () => {
    mockSession()
    const res = await getBusinessHandler(makeGet('http://localhost/api/business/get'))
    expect(res.status).toBe(400)
  })

  test('ownerId !== session user → 404 (IDOR protection)', async () => {
    mockSession(OTHER_ID)
    const res = await getBusinessHandler(makeGet(`http://localhost/api/business/get?ownerId=${OWNER_ID}`))
    expect(res.status).toBe(404)
  })

  test('ownerId matches session → 200', async () => {
    mockSession(OWNER_ID)
    // businesses query
    mockQueue.push({ data: [mockBusiness], error: null })
    // stamps count
    mockQueue.push({ count: 10, data: null, error: null })
    // customers count
    mockQueue.push({ count: 3, data: null, error: null })
    // business_customers join
    mockQueue.push({ data: [], error: null })
    // all stamps
    mockQueue.push({ data: [], error: null })

    const res = await getBusinessHandler(makeGet(`http://localhost/api/business/get?ownerId=${OWNER_ID}`))
    expect(res.status).toBe(200)
  })

  test('customer list output contains required fields but excludes customer_token', async () => {
    mockSession(OWNER_ID)
    // 1. businesses query
    mockQueue.push({ data: [mockBusiness], error: null })
    // 2. stamps count
    mockQueue.push({ count: 10, data: null, error: null })
    // 3. customers count
    mockQueue.push({ count: 1, data: null, error: null })
    // 4. business_customers join
    mockQueue.push({
      data: [{
        business_id: BIZ_ID,
        customer_id: CUST_ID,
        review_claimed: false,
        cards_redeemed: 0,
        enrolled_at: new Date().toISOString(),
        customer: {
          id: CUST_ID,
          name: 'Jane Doe',
          phone: '9876543210',
          whatsapp_optin: true,
          birthday_month: 'January',
          birthday_day: 1,
          created_at: new Date().toISOString()
        }
      }],
      error: null
    })
    // 5. all stamps
    mockQueue.push({ data: [], error: null })

    const res = await getBusinessHandler(makeGet(`http://localhost/api/business/get?ownerId=${OWNER_ID}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.customers).toBeDefined()
    expect(body.customers.length).toBe(1)
    
    const custRecord = body.customers[0]
    expect(custRecord.customer.id).toBe(CUST_ID)
    expect(custRecord.customer.name).toBe('Jane Doe')
    expect(custRecord.customer.phone).toBe('9876543210')
    expect(custRecord.customer.customer_token).toBeUndefined() // Token must be redacted!
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/business/update — auth required
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PATCH: updateHandler } = require('../../update/route')

describe('PATCH /api/business/update — auth security', () => {
  test('no session → 401', async () => {
    mockNoSession()
    const res = await updateHandler(makePatch('http://localhost/api/business/update', { id: BIZ_ID }))
    expect(res.status).toBe(401)
  })

  test('authenticated but wrong owner → 404', async () => {
    mockSession(OTHER_ID)
    // requireBusiness DB query returns business owned by OWNER_ID
    mockQueue.push({ data: mockBusiness, error: null })
    const res = await updateHandler(makePatch('http://localhost/api/business/update', { id: BIZ_ID }))
    expect(res.status).toBe(404)
  })

  test('invalid gmb_link → 400', async () => {
    mockSession(OWNER_ID)
    const res = await updateHandler(makePatch('http://localhost/api/business/update', {
      id: BIZ_ID,
      gmb_link: 'not-a-url',
    }))
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /api/business/export-customers — auth required
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: exportHandler } = require('../../export-customers/route')

describe('GET /api/business/export-customers — auth security', () => {
  test('no session → 401', async () => {
    mockNoSession()
    const res = await exportHandler(makeGet(`http://localhost/api/business/export-customers?bizId=${BIZ_ID}`))
    expect(res.status).toBe(401)
  })

  test('wrong owner → 404', async () => {
    mockSession(OTHER_ID)
    mockQueue.push({ data: mockBusiness, error: null })
    const res = await exportHandler(makeGet(`http://localhost/api/business/export-customers?bizId=${BIZ_ID}`))
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// GET /api/business/public — safe fields only
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: publicHandler } = require('../../public/route')

describe('GET /api/business/public — no secrets in response', () => {
  test('missing bizId and slug → 400', async () => {
    const res = await publicHandler(makeGet('http://localhost/api/business/public'))
    expect(res.status).toBe(400)
  })

  test('bizId not found → 404', async () => {
    mockQueue.push({ data: null, error: { message: 'Not found' } })
    const res = await publicHandler(makeGet(`http://localhost/api/business/public?bizId=${BIZ_ID}`))
    expect(res.status).toBe(404)
  })

  test('response does not contain staff_pin', async () => {
    const publicBusiness = {
      id: BIZ_ID,
      name: 'Test Cafe',
      slug: 'test-cafe',
      emoji: '☕',
      category: 'Cafe',
      stamps_required: 6,
      reward: 'Free coffee',
      gmb_link: null,
      dynamic_qr_enabled: true,
      staff_pin_enabled: false,
      whatsapp_enabled: false,
    }
    mockQueue.push({ data: publicBusiness, error: null })

    const res = await publicHandler(makeGet(`http://localhost/api/business/public?bizId=${BIZ_ID}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.business.staff_pin).toBeUndefined()
    expect(body.business.staff_pin_hash).toBeUndefined()
    expect(body.business.owner_id).toBeUndefined()
    expect(body.business.owner_phone).toBeUndefined()
  })

  test('no auth required — returns 200 without session', async () => {
    const publicBusiness = { id: BIZ_ID, name: 'Test Cafe', slug: 'test-cafe', emoji: '☕', category: 'Cafe', stamps_required: 6, reward: 'Free coffee', gmb_link: null, dynamic_qr_enabled: true, staff_pin_enabled: false, whatsapp_enabled: false }
    mockQueue.push({ data: publicBusiness, error: null })
    const res = await publicHandler(makeGet(`http://localhost/api/business/public?bizId=${BIZ_ID}`))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// POST /api/campaign/send — auth required + audience + delivered=0
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: campaignHandler } = require('../../../campaign/send/route')

describe('POST /api/campaign/send — auth + audience + honest accounting', () => {
  test('no session → 401', async () => {
    mockNoSession()
    const res = await campaignHandler(makePost('http://localhost/api/campaign/send', {
      business_id: BIZ_ID, message: 'Hello', audience: 'all',
    }))
    expect(res.status).toBe(401)
  })

  test('wrong owner → 404', async () => {
    mockSession(OTHER_ID)
    mockQueue.push({ data: mockBusiness, error: null })
    const res = await campaignHandler(makePost('http://localhost/api/campaign/send', {
      business_id: BIZ_ID, message: 'Hello', audience: 'all',
    }))
    expect(res.status).toBe(404)
  })

  test('invalid audience → 400', async () => {
    mockSession(OWNER_ID)
    const res = await campaignHandler(makePost('http://localhost/api/campaign/send', {
      business_id: BIZ_ID, message: 'Hello', audience: 'vip',
    }))
    expect(res.status).toBe(400)
  })

  test('campaign is recorded with delivered=0', async () => {
    mockSession(OWNER_ID)
    // requireUserAndBusiness: businesses query
    mockQueue.push({ data: mockBusiness, error: null })
    // business_customers query
    mockQueue.push({
      data: [{ customer_id: CUST_ID, customer: { phone: '9876543210', whatsapp_optin: true } }],
      error: null,
    })
    // campaign insert
    const insertedCampaign = { id: 'camp-1', business_id: BIZ_ID, message: 'Hello', audience: 'all', total_sent: 1, delivered: 0 }
    mockQueue.push({ data: insertedCampaign, error: null })

    const res = await campaignHandler(makePost('http://localhost/api/campaign/send', {
      business_id: BIZ_ID, message: 'Hello', audience: 'all',
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaign.delivered).toBe(0)
  })

  test('response message says "draft recorded" not "sent"', async () => {
    mockSession(OWNER_ID)
    mockQueue.push({ data: mockBusiness, error: null })
    mockQueue.push({
      data: [{ customer_id: CUST_ID, customer: { phone: '9876543210', whatsapp_optin: true } }],
      error: null,
    })
    mockQueue.push({ data: { id: 'camp-1', business_id: BIZ_ID, message: 'Hello', audience: 'all', total_sent: 1, delivered: 0 }, error: null })

    const res = await campaignHandler(makePost('http://localhost/api/campaign/send', {
      business_id: BIZ_ID, message: 'Hello', audience: 'all',
    }))
    const body = await res.json()
    expect(body.message).toMatch(/draft|recorded/i)
  })
})

// ---------------------------------------------------------------------------
// POST /api/milestones/save — auth required
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: milestoneSaveHandler } = require('../../../milestones/save/route')

describe('POST /api/milestones/save — auth security', () => {
  test('no session → 401', async () => {
    mockNoSession()
    const res = await milestoneSaveHandler(makePost('http://localhost/api/milestones/save', {
      business_id: BIZ_ID, conflict_priority: 'stamp', milestones: [],
    }))
    expect(res.status).toBe(401)
  })

  test('wrong owner → 404', async () => {
    mockSession(OTHER_ID)
    mockQueue.push({ data: mockBusiness, error: null })
    const res = await milestoneSaveHandler(makePost('http://localhost/api/milestones/save', {
      business_id: BIZ_ID, conflict_priority: 'stamp', milestones: [],
    }))
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// POST /api/stamp/redeem — cryptographic code
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: redeemHandler } = require('../../../stamp/redeem/route')

describe('POST /api/stamp/redeem — cryptographic code', () => {
  test('no completed card → 400', async () => {
    // business + bc + customer-token-verify in parallel (Promise.all order)
    mockQueue.push({ data: { stamps_required: 6, reward: 'Free coffee' }, error: null })
    mockQueue.push({ data: { cards_redeemed: 0 }, error: null })
    mockQueue.push({ data: { id: CUST_ID }, error: null })  // customer token verified
    // stamp count
    mockQueue.push({ count: 3, data: null, error: null })  // 3 stamps, needs 6

    const res = await redeemHandler(makePost('http://localhost/api/stamp/redeem', {
      customer_id: CUST_ID, business_id: BIZ_ID, customer_token: CUST_TOKEN,
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no completed card/i)
  })

  test('successful redemption returns a 6-char alphanumeric code', async () => {
    // business + bc + customer-token-verify in parallel
    mockQueue.push({ data: { stamps_required: 6, reward: 'Free coffee' }, error: null })
    mockQueue.push({ data: { cards_redeemed: 0 }, error: null })
    mockQueue.push({ data: { id: CUST_ID }, error: null })
    // stamp count
    mockQueue.push({ count: 6, data: null, error: null })
    // optimistic update succeeds
    mockQueue.push({ data: [{ cards_redeemed: 1 }], error: null })

    const res = await redeemHandler(makePost('http://localhost/api/stamp/redeem', {
      customer_id: CUST_ID, business_id: BIZ_ID, customer_token: CUST_TOKEN,
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.code).toMatch(/^[0-9A-F]{6}$/)
  })

  test('concurrent redemption attempt → 409 conflict', async () => {
    // business + bc + customer-token-verify in parallel
    mockQueue.push({ data: { stamps_required: 6, reward: 'Free coffee' }, error: null })
    mockQueue.push({ data: { cards_redeemed: 0 }, error: null })
    mockQueue.push({ data: { id: CUST_ID }, error: null })
    // stamp count
    mockQueue.push({ count: 6, data: null, error: null })
    // optimistic update returns empty (another request beat us)
    mockQueue.push({ data: [], error: null })

    const res = await redeemHandler(makePost('http://localhost/api/stamp/redeem', {
      customer_id: CUST_ID, business_id: BIZ_ID, customer_token: CUST_TOKEN,
    }))
    expect(res.status).toBe(409)
  })

  test('code is hex format (not Math.random base-36) — sequential calls', async () => {
    // Verify two sequential redemptions each return a 6-char uppercase hex code
    for (let i = 0; i < 2; i++) {
      mockQueue.push({ data: { stamps_required: 6, reward: 'Free coffee' }, error: null })
      mockQueue.push({ data: { cards_redeemed: i }, error: null })
      mockQueue.push({ data: { id: CUST_ID }, error: null })
      mockQueue.push({ count: 6 * (i + 1), data: null, error: null })
      mockQueue.push({ data: [{ cards_redeemed: i + 1 }], error: null })

      const req = makePost('http://localhost/api/stamp/redeem', {
        customer_id: CUST_ID, business_id: BIZ_ID, customer_token: CUST_TOKEN,
      })
      const res = await redeemHandler(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.code).toMatch(/^[0-9A-F]{6}$/)
    }
  })
})
