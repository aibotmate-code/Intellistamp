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
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
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
// Helpers
// ---------------------------------------------------------------------------

const OWNER_ID = '00000000-0000-4000-a000-000000000003'

const validBody = {
  name: 'Cafe Mocha',
  category: 'Cafe',
  emoji: '☕',
  owner_phone: '9876543210',
  stamps_required: 6,
  reward: 'Free coffee',
  staff_pin: '1234',
  dynamic_qr_enabled: true,
  staff_pin_enabled: false,
}

const mockCreatedBusiness = {
  id: 'biz-new-001',
  name: 'Cafe Mocha',
  slug: 'cafe-mocha',
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: true,
  staff_pin_enabled: false,
  plan: 'free',
  created_at: new Date().toISOString(),
}

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/business/create', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockAuthSession(userId = OWNER_ID) {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: userId, email: 'owner@example.com' } } },
  })
}

function mockNoSession() {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } })
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../create/route')

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

describe('POST /api/business/create', () => {
  test('missing name → 400 validation error', async () => {
    mockAuthSession()
    const req = makeRequest({ ...validBody, name: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('missing reward → 400 validation error', async () => {
    mockAuthSession()
    const req = makeRequest({ ...validBody, reward: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('invalid pin (not 4 digits) → 400 error', async () => {
    mockAuthSession()
    const req = makeRequest({ ...validBody, staff_pin: '12' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('invalid pin (letters) → 400 error', async () => {
    mockAuthSession()
    const req = makeRequest({ ...validBody, staff_pin: 'abcd' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('valid data → 200 with business object', async () => {
    mockAuthSession()
    // slug check → no existing slug
    mockQueue.push({ data: null, error: null })
    // insert → success
    mockQueue.push({ data: mockCreatedBusiness, error: null })

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.business).toBeDefined()
  })

  test('valid data → business has slug generated', async () => {
    mockAuthSession()
    mockQueue.push({ data: null, error: null })
    mockQueue.push({ data: { ...mockCreatedBusiness, slug: 'cafe-mocha' }, error: null })

    const req = makeRequest(validBody)
    const res = await POST(req)
    const body = await res.json()
    expect(body.business.slug).toBeDefined()
    expect(body.business.slug.length).toBeGreaterThan(0)
  })

  test('valid data → business has owner_id set', async () => {
    mockAuthSession(OWNER_ID)
    mockQueue.push({ data: null, error: null })
    mockQueue.push({ data: { ...mockCreatedBusiness, owner_id: OWNER_ID }, error: null })

    const req = makeRequest(validBody)
    const res = await POST(req)
    const body = await res.json()
    expect(body.business.owner_id).toBe(OWNER_ID)
  })

  test('duplicate slug → slug gets suffix appended', async () => {
    mockAuthSession()
    // First slug check → slug exists
    mockQueue.push({ data: { id: 'existing' }, error: null })
    // insert with suffixed slug
    mockQueue.push({ data: { ...mockCreatedBusiness, slug: 'cafe-mocha-ab12' }, error: null })

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    // Slug should have a suffix (longer than base slug)
    expect(body.business.slug.length).toBeGreaterThan('cafe-mocha'.length)
  })

  test('unauthenticated request → 401 error', async () => {
    mockNoSession()
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('stamps_required below 3 → 400 error', async () => {
    mockAuthSession()
    const req = makeRequest({ ...validBody, stamps_required: 2 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('stamps_required above 20 → 400 error', async () => {
    mockAuthSession()
    const req = makeRequest({ ...validBody, stamps_required: 21 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
