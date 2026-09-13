/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { generatePollingToken } from '@/lib/server/pendingCheckins'

const BIZ_ID = '11111111-1111-4000-a000-000000000001'
const CUST_ID = '22222222-2222-4000-a000-000000000002'
const CHK_ID = '33333333-3333-4000-a000-000000000003'

let mockBusiness: any = {
  id: BIZ_ID,
  dynamic_qr_enabled: false,
  staff_pin_enabled: true,
  approval_status: 'approved',
}

let mockPendingRecord: any = null

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
      if (table === 'pending_checkins') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: CHK_ID,
                  business_id: BIZ_ID,
                  customer_id: CUST_ID,
                  status: 'pending',
                  created_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(() =>
                  Promise.resolve({ data: mockPendingRecord, error: mockPendingRecord ? null : { message: 'not found' } })
                ),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  })),
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
import { POST as handleCheckin } from '../checkin/route'
import { GET as handleCheckinStatus } from '../checkin-status/route'

describe('Mode C Customer Check-in & Status API - Requirements I through N', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ACCESS_GRANT_SECRET = 'test_secret_key_123456789012345678901234'
    mockBusiness = {
      id: BIZ_ID,
      dynamic_qr_enabled: false,
      staff_pin_enabled: true,
      approval_status: 'approved',
    }
    mockPendingRecord = {
      id: CHK_ID,
      business_id: BIZ_ID,
      customer_id: CUST_ID,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      approved_at: null,
      result_stamp_id: null,
      result_payload: null,
    }
  })

  // ── K: Mode A cannot create pending check-in ────────────────────────────────
  test('K. Mode A (dynamic_qr_enabled=true, staff_pin_enabled=false) cannot create pending check-in', async () => {
    mockBusiness.dynamic_qr_enabled = true
    mockBusiness.staff_pin_enabled = false

    const req = new NextRequest('http://localhost/api/customer/checkin', {
      method: 'POST',
      body: JSON.stringify({ business_id: BIZ_ID, customer_id: CUST_ID }),
    })

    const res = await handleCheckin(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Mode C')
  })

  // ── L: Mode B cannot create pending check-in ────────────────────────────────
  test('L. Mode B (dynamic_qr_enabled=true, staff_pin_enabled=true) cannot create pending check-in', async () => {
    mockBusiness.dynamic_qr_enabled = true
    mockBusiness.staff_pin_enabled = true

    const req = new NextRequest('http://localhost/api/customer/checkin', {
      method: 'POST',
      body: JSON.stringify({ business_id: BIZ_ID, customer_id: CUST_ID }),
    })

    const res = await handleCheckin(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Mode C')
  })

  // ── M: Mode C can create pending check-in ──────────────────────────────────
  test('M. Mode C (dynamic_qr_enabled=false, staff_pin_enabled=true) can create pending check-in', async () => {
    mockBusiness.dynamic_qr_enabled = false
    mockBusiness.staff_pin_enabled = true

    const req = new NextRequest('http://localhost/api/customer/checkin', {
      method: 'POST',
      body: JSON.stringify({ business_id: BIZ_ID, customer_id: CUST_ID }),
    })

    const res = await handleCheckin(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.checkin_id).toBe(CHK_ID)
    expect(data.poll_token).toBeDefined()
    expect(typeof data.poll_token).toBe('string')
  })

  // ── N: Mode D cannot create pending check-in ────────────────────────────────
  test('N. Mode D (dynamic_qr_enabled=false, staff_pin_enabled=false) cannot create pending check-in', async () => {
    mockBusiness.dynamic_qr_enabled = false
    mockBusiness.staff_pin_enabled = false

    const req = new NextRequest('http://localhost/api/customer/checkin', {
      method: 'POST',
      body: JSON.stringify({ business_id: BIZ_ID, customer_id: CUST_ID }),
    })

    const res = await handleCheckin(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Mode C')
  })

  // ── I: Customer status request without valid poll token rejected ───────────
  test('I. customer status request without valid poll token rejected with 401', async () => {
    const req = new NextRequest(`http://localhost/api/customer/checkin-status?checkinId=${CHK_ID}&businessId=${BIZ_ID}`)
    const res = await handleCheckinStatus(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('pollToken required')
  })

  // ── J: Tampered or expired poll token rejected ──────────────────────────────
  test('J. tampered poll token is rejected with 403', async () => {
    const validToken = generatePollingToken({
      checkin_id: CHK_ID,
      business_id: BIZ_ID,
      customer_id: CUST_ID,
    })

    const tamperedToken = validToken.slice(0, -4) + 'abcd'

    const req = new NextRequest(
      `http://localhost/api/customer/checkin-status?checkinId=${CHK_ID}&businessId=${BIZ_ID}&pollToken=${tamperedToken}`
    )
    const res = await handleCheckinStatus(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Invalid or expired polling token')
  })

  test('J2. expired poll token is rejected with 403', async () => {
    // Generate token that expired 1 second ago
    const expiredToken = generatePollingToken({
      checkin_id: CHK_ID,
      business_id: BIZ_ID,
      customer_id: CUST_ID,
      ttlMs: -1000,
    })

    const req = new NextRequest(
      `http://localhost/api/customer/checkin-status?checkinId=${CHK_ID}&businessId=${BIZ_ID}&pollToken=${expiredToken}`
    )
    const res = await handleCheckinStatus(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Invalid or expired polling token')
  })

  test('Customer status request with valid poll token succeeds and returns pending status', async () => {
    const validToken = generatePollingToken({
      checkin_id: CHK_ID,
      business_id: BIZ_ID,
      customer_id: CUST_ID,
    })

    const req = new NextRequest(
      `http://localhost/api/customer/checkin-status?checkinId=${CHK_ID}&businessId=${BIZ_ID}&pollToken=${validToken}`
    )
    const res = await handleCheckinStatus(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('pending')
  })

  test('Customer status request with valid poll token returns approved card state after staff approval', async () => {
    mockPendingRecord = {
      id: CHK_ID,
      business_id: BIZ_ID,
      customer_id: CUST_ID,
      status: 'approved',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      approved_at: new Date().toISOString(),
      result_stamp_id: 'stamp-123',
      result_payload: {
        total_stamps: 2,
        card_stamps: 2,
        cards_completed: 0,
        redeemable: false,
      },
    }

    const validToken = generatePollingToken({
      checkin_id: CHK_ID,
      business_id: BIZ_ID,
      customer_id: CUST_ID,
    })

    const req = new NextRequest(
      `http://localhost/api/customer/checkin-status?checkinId=${CHK_ID}&businessId=${BIZ_ID}&pollToken=${validToken}`
    )
    const res = await handleCheckinStatus(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('approved')
    expect(data.card_state.total_stamps).toBe(2)
    expect(data.access_grant).toBeDefined()
  })
})
