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
const { GET: getPdf } = require('../pdf/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getCustomersCsv } = require('../customers/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getActivityCsv } = require('../activity/route')

const ADMIN_EMAIL = 'admin@intellicallabs.com'
const NON_ADMIN_EMAIL = 'merchant@example.com'
const BIZ_A = '11111111-1111-1111-1111-111111111111'

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

describe('Admin Exports API Suite', () => {
  describe('Authorization Tests', () => {
    test('unauthenticated request to PDF export → 401 error', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } })
      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_A}/export/pdf`)
      const res = await getPdf(req, { params: Promise.resolve({ bizId: BIZ_A }) })
      expect(res.status).toBe(401)
    })

    test('non-admin request to Customers CSV export → 403 error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-2', email: NON_ADMIN_EMAIL } } },
      })
      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_A}/export/customers`)
      const res = await getCustomersCsv(req, { params: Promise.resolve({ bizId: BIZ_A }) })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Admin access required')
    })

    test('non-admin request to Activity CSV export → 403 error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-2', email: NON_ADMIN_EMAIL } } },
      })
      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_A}/export/activity`)
      const res = await getActivityCsv(req, { params: Promise.resolve({ bizId: BIZ_A }) })
      expect(res.status).toBe(403)
    })
  })

  describe('Customers CSV Export Tests', () => {
    test('admin export returns properly formatted CSV with required headers', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })

      // 1. Business query for slug
      mockQueue.push({
        data: { id: BIZ_A, name: 'Coffea Staging', slug: 'coffea' },
        error: null,
      })

      // 2. getTenantCustomers -> business stamps_required query
      mockQueue.push({
        data: { stamps_required: 6 },
        error: null,
      })

      // 3. getTenantCustomers -> business_customers query
      mockQueue.push({
        data: [
          {
            id: 'bc-1',
            customer_id: 'cust-1',
            enrolled_at: '2026-08-01T10:00:00Z',
            cards_redeemed: 1,
            customer: { id: 'cust-1', name: 'Aarav Sharma', phone: '+919876543210' },
          },
        ],
        error: null,
      })

      // 4. getTenantCustomers -> stamps query
      mockQueue.push({
        data: [
          { id: 's-1', customer_id: 'cust-1', stamped_at: '2026-08-20T15:00:00Z', type: 'regular' },
          { id: 's-2', customer_id: 'cust-1', stamped_at: '2026-08-10T15:00:00Z', type: 'regular' },
        ],
        error: null,
      })

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_A}/export/customers`)
      const res = await getCustomersCsv(req, { params: Promise.resolve({ bizId: BIZ_A }) })
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')
      expect(res.headers.get('Content-Disposition')).toContain('coffea-customers-')

      const text = await res.text()
      const lines = text.split('\n')
      expect(lines[0]).toBe('Customer Name,Mobile Number,Enrolled Date,Total Stamps,Current Progress,Rewards Claimed,Last Visit,Status')
      expect(lines[1]).toContain('Aarav Sharma')
      expect(lines[1]).toContain('+919876543210')
      expect(lines[1]).toContain('2026-08-01')
      expect(lines[1]).toContain('2') // Total stamps
    })
  })

  describe('Activity CSV Export Tests', () => {
    test('admin export returns activity events sorted newest first', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })

      // 1. Business query
      mockQueue.push({
        data: { id: BIZ_A, name: 'Coffea Staging', slug: 'coffea' },
        error: null,
      })

      // 2. getTenantActivity -> stamps query
      mockQueue.push({
        data: [
          {
            id: 's-1',
            type: 'regular',
            stamped_at: '2026-08-21T10:00:00Z',
            customer: { name: 'Priya Patel', phone: '+919876543211' },
          },
        ],
        error: null,
      })

      // 3. getTenantActivity -> business_customers query
      mockQueue.push({
        data: [
          {
            id: 'bc-1',
            enrolled_at: '2026-08-20T09:00:00Z',
            cards_redeemed: 0,
            customer: { name: 'Priya Patel', phone: '+919876543211' },
          },
        ],
        error: null,
      })

      // 4. getTenantActivity -> milestone_claims query
      mockQueue.push({
        data: [],
        error: null,
      })

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_A}/export/activity`)
      const res = await getActivityCsv(req, { params: Promise.resolve({ bizId: BIZ_A }) })
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')

      const text = await res.text()
      const lines = text.split('\n')
      expect(lines[0]).toBe('Date/Time,Event Type,Customer,Event Description,Actor/Source')
      expect(lines[1]).toContain('stamp_issued')
      expect(lines[1]).toContain('Priya Patel')
    })
  })

  describe('PDF Report Export Tests', () => {
    test('generates valid PDF buffer with correct content-type and filename', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })

      // 1. Route business query
      mockQueue.push({
        data: { id: BIZ_A, name: 'Coffea Staging', slug: 'coffea' },
        error: null,
      })

      // 2. generateBusinessReportPdf -> business query
      mockQueue.push({
        data: {
          id: BIZ_A,
          name: 'Coffea Staging',
          slug: 'coffea',
          reward: 'Free Coffee',
          stamps_required: 6,
          brand_primary_color: '#F59E0B',
        },
        error: null,
      })

      // 3. getBusinessAnalytics -> business query
      mockQueue.push({
        data: {
          id: BIZ_A,
          name: 'Coffea Staging',
          stamps_required: 6,
          reward: 'Free Coffee',
          created_at: '2026-07-01T00:00:00Z',
        },
        error: null,
      })

      // 4. getBusinessAnalytics -> business_customers query
      mockQueue.push({
        data: [
          {
            id: 'bc-1',
            customer_id: 'cust-1',
            enrolled_at: '2026-08-05T00:00:00Z',
            cards_redeemed: 0,
            customer: { id: 'cust-1', name: 'Rahul', phone: '+919876543210' },
          },
        ],
        error: null,
      })

      // 5. getBusinessAnalytics -> recent stamps query
      mockQueue.push({
        data: [
          { id: 's-1', customer_id: 'cust-1', stamped_at: '2026-08-20T00:00:00Z', type: 'regular' },
        ],
        error: null,
      })

      // 6. getBusinessAnalytics -> lifetime stamps query
      mockQueue.push({
        data: [
          { customer_id: 'cust-1', stamped_at: '2026-08-20T00:00:00Z' },
        ],
        error: null,
      })

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_A}/export/pdf?period=30d`)
      const res = await getPdf(req, { params: Promise.resolve({ bizId: BIZ_A }) })
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/pdf')
      expect(res.headers.get('Content-Disposition')).toContain('coffea-performance-report-30d-')

      const arrayBuf = await res.arrayBuffer()
      const buf = Buffer.from(arrayBuf)
      // PDF documents start with %PDF- header
      expect(buf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })
})
