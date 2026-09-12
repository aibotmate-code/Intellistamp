/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Security Modes Integration Test Suite
 *
 * Verifies all 4 security combinations:
 *
 * MODE A: dynamic_qr_enabled = true, staff_pin_enabled = false
 *   - QR rotates
 *   - Signed QR token required and cryptographically verified
 *   - No staff PIN required
 *   - Cooldown and rate limits apply
 *
 * MODE B: dynamic_qr_enabled = true, staff_pin_enabled = true
 *   - QR rotates
 *   - Signed QR token must be valid
 *   - Staff PIN is ALSO required
 *   - Valid QR does NOT bypass PIN
 *   - Stamp issues only when both conditions are satisfied
 *
 * MODE C: dynamic_qr_enabled = false, staff_pin_enabled = true
 *   - QR is static
 *   - No token refresh / no dynamic token required
 *   - Customer can identify from static QR
 *   - Actual stamp issuance requires valid staff PIN
 *
 * MODE D: dynamic_qr_enabled = false, staff_pin_enabled = false
 *   - Static QR
 *   - No token required, no staff PIN required
 *   - Stamp allowed under 4-hour cooldown lock and IP rate limits
 */
import { NextRequest } from 'next/server'
process.env.QR_SECRET_KEY = 'test-secret-12345678901234567890123456789012'
import { generateServerToken } from '@/lib/server/token'

// ── Supabase mock ────────────────────────────────────────────────────────────
let mockQueue: any[] = []
function dequeue() { return mockQueue.shift() ?? { data: null, error: null } }

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
  then(resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockChain),
}))

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  peekRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  resetRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn().mockReturnValue(new Response('Rate limit', { status: 429 })),
  rateLimitErrorResponse: jest.fn().mockReturnValue(
    new Response('{"error":"Service temporarily unavailable."}', { status: 503 })
  ),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn(() => 'mock_hash'),
}))

jest.mock('@/lib/pinHash', () => ({
  verifyPin: jest.fn().mockResolvedValue(true),
}))

// ── Imports after mocks ──────────────────────────────────────────────────────
import { verifyPin } from '@/lib/pinHash'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../issue/route')

// ── Constants ────────────────────────────────────────────────────────────────
const BIZ_ID = '00000000-0000-4000-a000-000000000001'
const CUST_ID = '00000000-0000-4000-a000-000000000002'

const MODE_A_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: true,
  staff_pin_enabled: false,
  staff_pin_hash: null,
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const MODE_B_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: true,
  staff_pin_enabled: true,
  staff_pin_hash: '$2a$10$hashed_pin',
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const MODE_C_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: false,
  staff_pin_enabled: true,
  staff_pin_hash: '$2a$10$hashed_pin',
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const MODE_D_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: false,
  staff_pin_enabled: false,
  staff_pin_hash: null,
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const STAMP_RPC_SUCCESS = {
  total_stamps: 1,
  stamp: { id: 'stamp-1', customer_id: CUST_ID, business_id: BIZ_ID },
  reward_result: null,
}

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/stamp/issue', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
  ;(verifyPin as jest.Mock).mockReset()
  ;(verifyPin as jest.Mock).mockResolvedValue(true)
  mockChain.from.mockReturnThis()
  mockChain.select.mockReturnThis()
  mockChain.insert.mockReturnThis()
  mockChain.eq.mockReturnThis()
  mockChain.single.mockImplementation(() => Promise.resolve(dequeue()))
  mockChain.maybeSingle.mockImplementation(() => Promise.resolve(dequeue()))
  mockChain.then = function (resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  }
})

describe('Security Modes (A, B, C, D)', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // MODE A: Dynamic QR = ON, Staff PIN = OFF
  // ───────────────────────────────────────────────────────────────────────────
  describe('MODE A: Dynamic QR = ON, Staff PIN = OFF', () => {
    test('succeeds with valid signed QR token without staff PIN', async () => {
      mockQueue.push({ data: MODE_A_BUSINESS, error: null })
      mockQueue.push({ data: STAMP_RPC_SUCCESS, error: null })

      const token = generateServerToken(BIZ_ID)
      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        token,
      }))

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(verifyPin).not.toHaveBeenCalled()
      expect(mockChain.rpc).toHaveBeenCalledWith('issue_stamp_atomic', {
        p_customer_id: CUST_ID,
        p_business_id: BIZ_ID,
        p_type: 'regular',
        p_stamp_token: token,
      })
    })

    test('rejects with 401 when token is missing', async () => {
      mockQueue.push({ data: MODE_A_BUSINESS, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
      }))

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toContain('Valid QR scan required')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })

    test('rejects with 401 when token is invalid or expired', async () => {
      mockQueue.push({ data: MODE_A_BUSINESS, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        token: 'invalid.hmac.token',
      }))

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toContain('Invalid or expired token')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // MODE B: Dynamic QR = ON, Staff PIN = ON
  // ───────────────────────────────────────────────────────────────────────────
  describe('MODE B: Dynamic QR = ON, Staff PIN = ON', () => {
    test('succeeds when both valid QR token AND valid staff PIN are provided', async () => {
      mockQueue.push({ data: MODE_B_BUSINESS, error: null })
      mockQueue.push({ data: STAMP_RPC_SUCCESS, error: null })

      const token = generateServerToken(BIZ_ID)
      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        token,
        staff_pin: '1234',
      }))

      expect(res.status).toBe(200)
      expect(verifyPin).toHaveBeenCalled()
      expect(mockChain.rpc).toHaveBeenCalledWith('issue_stamp_atomic', {
        p_customer_id: CUST_ID,
        p_business_id: BIZ_ID,
        p_type: 'regular',
        p_stamp_token: token,
      })
    })

    test('valid QR does NOT bypass PIN: rejects with 400 when PIN is missing', async () => {
      mockQueue.push({ data: MODE_B_BUSINESS, error: null })

      const token = generateServerToken(BIZ_ID)
      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        token,
        // No PIN provided
      }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid staff PIN')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })

    test('rejects with 400 when PIN is invalid', async () => {
      mockQueue.push({ data: MODE_B_BUSINESS, error: null })
      ;(verifyPin as jest.Mock).mockResolvedValueOnce(false)

      const token = generateServerToken(BIZ_ID)
      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        token,
        staff_pin: '9999',
      }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid staff PIN')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })

    test('rejects with 401 when token is missing even if PIN is provided', async () => {
      mockQueue.push({ data: MODE_B_BUSINESS, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        staff_pin: '1234',
      }))

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toContain('Valid QR scan required')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // MODE C: Dynamic QR = OFF, Staff PIN = ON
  // ───────────────────────────────────────────────────────────────────────────
  describe('MODE C: Dynamic QR = OFF, Staff PIN = ON', () => {
    test('succeeds without rotating token when valid staff PIN is provided', async () => {
      mockQueue.push({ data: MODE_C_BUSINESS, error: null })
      mockQueue.push({ data: STAMP_RPC_SUCCESS, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        staff_pin: '1234',
        // No token (static QR flow)
      }))

      expect(res.status).toBe(200)
      expect(verifyPin).toHaveBeenCalled()
      expect(mockChain.rpc).toHaveBeenCalledWith('issue_stamp_atomic', {
        p_customer_id: CUST_ID,
        p_business_id: BIZ_ID,
        p_type: 'regular',
        p_stamp_token: null,
      })
    })

    test('rejects with 400 when staff PIN is missing in static mode', async () => {
      mockQueue.push({ data: MODE_C_BUSINESS, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        // No PIN provided
      }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid staff PIN')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })

    test('rejects with 400 when staff PIN is incorrect in static mode', async () => {
      mockQueue.push({ data: MODE_C_BUSINESS, error: null })
      ;(verifyPin as jest.Mock).mockResolvedValueOnce(false)

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        staff_pin: '0000',
      }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid staff PIN')
      expect(mockChain.rpc).not.toHaveBeenCalled()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // MODE D: Dynamic QR = OFF, Staff PIN = OFF (Weakest mode)
  // ───────────────────────────────────────────────────────────────────────────
  describe('MODE D: Dynamic QR = OFF, Staff PIN = OFF (Weakest mode)', () => {
    test('succeeds without token or PIN on initial stamp', async () => {
      mockQueue.push({ data: MODE_D_BUSINESS, error: null })
      mockQueue.push({ data: STAMP_RPC_SUCCESS, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
        // No token, no PIN
      }))

      expect(res.status).toBe(200)
      expect(verifyPin).not.toHaveBeenCalled()
      expect(mockChain.rpc).toHaveBeenCalledWith('issue_stamp_atomic', {
        p_customer_id: CUST_ID,
        p_business_id: BIZ_ID,
        p_type: 'regular',
        p_stamp_token: null,
      })
    })

    test('enforces 4-hour cooldown lock on repeat stamp attempt', async () => {
      mockQueue.push({ data: MODE_D_BUSINESS, error: null })
      mockQueue.push({ data: { error: 'cooldown', hours_left: 4 }, error: null })

      const res = await POST(makeReq({
        customer_id: CUST_ID,
        business_id: BIZ_ID,
      }))

      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toContain('You already stamped recently')
      expect(body.cooldown_hours).toBe(4)
    })
  })
})
