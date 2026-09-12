/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Flow Separation Tests — Signed Customer QR vs Manual Staff PIN
 *
 * Verifies that the server correctly separates:
 *   A. Customer QR flow:  valid HMAC token → no PIN required
 *   B. Manual dashboard:  no valid token   → PIN required when enabled
 *   C. Kiosk flow:        always requires PIN (separate route)
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
const BIZ_ID = '00000000-0000-4000-b000-000000000001'
const OTHER_BIZ_ID = '00000000-0000-4000-b000-000000000002'
const CUST_ID = '00000000-0000-4000-b000-000000000003'

const PIN_ENABLED_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: true,
  staff_pin_enabled: true,        // ← Mode B (Dynamic QR + Staff PIN)
  staff_pin_hash: '$2a$10$mock',
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const PIN_DISABLED_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: true,
  staff_pin_enabled: false,       // ← Mode A (Dynamic QR, No PIN)
  staff_pin_hash: null,
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const STATIC_PIN_BUSINESS = {
  id: BIZ_ID,
  stamps_required: 6,
  reward: 'Free coffee',
  dynamic_qr_enabled: false,      // ← Mode C (Static QR + Staff PIN)
  staff_pin_enabled: true,
  staff_pin_hash: '$2a$10$mock',
  conflict_priority: 'stamp',
  approval_status: 'approved',
  plan_expires_at: null,
}

const STAMP_RPC_RESULT = {
  total_stamps: 1,
  stamp: { id: 's1', customer_id: CUST_ID, business_id: BIZ_ID },
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Flow Separation: Customer QR vs Manual Staff PIN', () => {

  // ─── Test 1 ─────────────────────────────────────────────────────────────
  test('1. Valid signed QR + customer issues stamp without staff PIN when PIN is disabled (Mode A)', async () => {
    // Mode A: dynamic QR enabled, staff PIN disabled
    mockQueue.push({ data: PIN_DISABLED_BUSINESS, error: null })
    mockQueue.push({ data: STAMP_RPC_RESULT, error: null })

    const token = generateServerToken(BIZ_ID)
    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      token,
      // NO staff_pin — Mode A does not require PIN
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.stamp).toBeDefined()

    // verifyPin must NOT have been called
    expect(verifyPin).not.toHaveBeenCalled()
  })

  // ─── Test 2 ─────────────────────────────────────────────────────────────
  test('2. Mode B: Valid signed QR WITHOUT staff PIN is rejected with 400 (PIN is strictly required)', async () => {
    mockQueue.push({ data: PIN_ENABLED_BUSINESS, error: null })

    ;(verifyPin as jest.Mock).mockResolvedValueOnce(false)

    const token = generateServerToken(BIZ_ID)
    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      token,
      // NO staff_pin provided
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid staff PIN')
    expect(mockChain.rpc).not.toHaveBeenCalled()
  })

  // ─── Test 3 ─────────────────────────────────────────────────────────────
  test('3. Expired / invalid QR token is rejected with 401', async () => {
    mockQueue.push({ data: PIN_DISABLED_BUSINESS, error: null })

    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      token: 'tampered.or.expired.token',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Invalid or expired token')
    expect(mockChain.rpc).not.toHaveBeenCalled()
  })

  // ─── Test 4 ─────────────────────────────────────────────────────────────
  test('4. Replayed QR token is rejected with 409', async () => {
    mockQueue.push({ data: PIN_DISABLED_BUSINESS, error: null })
    mockQueue.push({ data: { error: 'token_used' }, error: null })

    const token = generateServerToken(BIZ_ID)
    const req = makeReq({ customer_id: CUST_ID, business_id: BIZ_ID, token })

    const res = await POST(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('already used')
  })

  // ─── Test 5 ─────────────────────────────────────────────────────────────
  test('5. Mode C: Static QR stamp without valid PIN is rejected with 400', async () => {
    mockQueue.push({ data: STATIC_PIN_BUSINESS, error: null })

    ;(verifyPin as jest.Mock).mockResolvedValueOnce(false) // wrong PIN

    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      // Static QR mode: no rotating token
      staff_pin: '9999', // wrong PIN
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid staff PIN')
    expect(verifyPin).toHaveBeenCalled()
    expect(mockChain.rpc).not.toHaveBeenCalled()
  })

  // ─── Test 6 ─────────────────────────────────────────────────────────────
  test('6. Kiosk stamp (/api/kiosk/stamp) always requires PIN separately', async () => {
    // This test confirms kiosk/stamp has its own PIN requirement and
    // is a completely separate route from stamp/issue — they share no logic.
    // The kiosk route is tested independently; here we verify the schema enforces `pin` field.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST: kioskPOST } = require('../../kiosk/stamp/route')

    mockQueue.push({ data: { ...PIN_ENABLED_BUSINESS, staff_pin_hash: '$2a$10$mock' }, error: null })

    // Missing pin → schema rejects before any business logic
    const req = new NextRequest('http://localhost/api/kiosk/stamp', {
      method: 'POST',
      body: JSON.stringify({ business_id: BIZ_ID, phone: '9876543210' /* no pin */ }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await kioskPOST(req)
    expect(res.status).toBe(400) // schema validation rejects missing pin
  })

  // ─── Test 7 ─────────────────────────────────────────────────────────────
  test('7. Mode C: Static QR stamp with correct PIN succeeds', async () => {
    mockQueue.push({ data: STATIC_PIN_BUSINESS, error: null })
    mockQueue.push({ data: STAMP_RPC_RESULT, error: null })

    ;(verifyPin as jest.Mock).mockResolvedValueOnce(true) // correct PIN

    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      staff_pin: '1234',
      // Static QR mode: no rotating token
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(verifyPin).toHaveBeenCalled()
    expect(mockChain.rpc).toHaveBeenCalledWith('issue_stamp_atomic', {
      p_customer_id: CUST_ID,
      p_business_id: BIZ_ID,
      p_type: 'regular',
      p_stamp_token: null,
    })
  })

  // ─── Test 8 ─────────────────────────────────────────────────────────────
  test('8. Mode B: Valid signed QR + correct staff PIN succeeds', async () => {
    mockQueue.push({ data: PIN_ENABLED_BUSINESS, error: null })
    mockQueue.push({ data: STAMP_RPC_RESULT, error: null })

    ;(verifyPin as jest.Mock).mockResolvedValueOnce(true)

    const token = generateServerToken(BIZ_ID)
    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      token,
      staff_pin: '1234',
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(verifyPin).toHaveBeenCalled()
    expect(mockChain.rpc).toHaveBeenCalledWith('issue_stamp_atomic', {
      p_customer_id: CUST_ID,
      p_business_id: BIZ_ID,
      p_type: 'regular',
      p_stamp_token: token,
    })
  })

  // ─── Test 9 ─────────────────────────────────────────────────────────────
  test('9. Missing token when dynamic QR is enabled is rejected with 401', async () => {
    mockQueue.push({ data: PIN_ENABLED_BUSINESS, error: null })

    const req = makeReq({
      customer_id: CUST_ID,
      business_id: BIZ_ID,
      staff_pin: '1234',
      // No token
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Valid QR scan required')
  })

  // ─── Test 10 ────────────────────────────────────────────────────────────
  test('10. Cross-business QR scan is denied — token signed for BIZ_A rejected for BIZ_B', async () => {
    // Token generated for BIZ_ID, but request targets OTHER_BIZ_ID
    mockQueue.push({
      data: { ...PIN_DISABLED_BUSINESS, id: OTHER_BIZ_ID },
      error: null,
    })

    const tokenForBizA = generateServerToken(BIZ_ID)
    const req = makeReq({
      customer_id: CUST_ID,
      business_id: OTHER_BIZ_ID,
      token: tokenForBizA,
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Invalid or expired token')
    expect(mockChain.rpc).not.toHaveBeenCalled()
  })
})
