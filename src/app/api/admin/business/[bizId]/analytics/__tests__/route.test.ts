/* eslint-disable @typescript-eslint/no-explicit-any */
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
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
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
// Auth helpers mock
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../route')

const ADMIN_EMAIL = 'admin@intellicallabs.com'
const NON_ADMIN_EMAIL = 'merchant@example.com'
const BIZ_ID = '550e8400-e29b-41d4-a716-446655440000'

beforeAll(() => {
  process.env.INTELLICAL_ADMIN_EMAILS = ADMIN_EMAIL
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
})

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
})

describe('Admin Analytics API: /api/admin/business/[bizId]/analytics', () => {
  test('unauthenticated request → 401 error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/analytics`)
    const res = await GET(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
    expect(res.status).toBe(401)
  })

  test('non-admin request → 403 error', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: NON_ADMIN_EMAIL } } },
    })
    const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/analytics`)
    const res = await GET(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('Admin access required')
  })

  test('admin request → 200 with tenant-scoped aggregated analytics', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
    })

    const now = new Date()
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Business query
    mockQueue.push({
      data: {
        id: BIZ_ID,
        name: 'Coffea Staging',
        stamps_required: 6,
        reward: 'Free Coffee',
        created_at: fortyDaysAgo,
      },
      error: null,
    })

    // 2. Business customers query
    mockQueue.push({
      data: [
        {
          id: 'bc-1',
          customer_id: 'cust-1',
          enrolled_at: fortyDaysAgo,
          cards_redeemed: 1,
          customer: { id: 'cust-1', name: 'Rahul', phone: '+919876543210' },
        },
        {
          id: 'bc-2',
          customer_id: 'cust-2',
          enrolled_at: fiveDaysAgo,
          cards_redeemed: 0,
          customer: { id: 'cust-2', name: 'Priya', phone: '+919876543211' },
        },
      ],
      error: null,
    })

    // 3. Stamps recent query
    mockQueue.push({
      data: [
        { id: 's-1', customer_id: 'cust-1', stamped_at: fiveDaysAgo, type: 'regular' },
        { id: 's-2', customer_id: 'cust-2', stamped_at: fiveDaysAgo, type: 'regular' },
      ],
      error: null,
    })

    // 4. Lifetime stamps query
    mockQueue.push({
      data: [
        { customer_id: 'cust-1', stamped_at: fiveDaysAgo },
        { customer_id: 'cust-1', stamped_at: fortyDaysAgo },
        { customer_id: 'cust-2', stamped_at: fiveDaysAgo },
      ],
      error: null,
    })

    const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/analytics?period=30d`)
    const res = await GET(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.analytics.businessId).toBe(BIZ_ID)
    expect(json.analytics.kpis.totalCustomers.current).toBe(2)
    expect(json.analytics.kpis.activeCustomers.current).toBe(2)
    expect(json.analytics.kpis.stampsIssued.current).toBe(2)
    expect(json.analytics.kpis.rewardsRedeemed.current).toBe(1)
    expect(json.analytics.timeSeries).toHaveLength(30)
  })
})
