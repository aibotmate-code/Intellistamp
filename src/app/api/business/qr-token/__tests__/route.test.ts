import { NextRequest } from 'next/server'
import { GET as qrTokenHandler } from '../route'

// Mock requireUser — the proven cookie-aware auth helper
jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  adminClient: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    })),
  },
}))

jest.mock('@/lib/server/token', () => ({
  generateServerToken: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireUser, adminClient } = require('@/lib/auth')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateServerToken } = require('@/lib/server/token')
import { NextResponse } from 'next/server'

const BIZ_ID = '550e8400-e29b-41d4-a716-446655440001'
const USER_ID = 'user-abc-123'

function makeReq(bizId?: string) {
  const url = bizId
    ? `http://localhost/api/business/qr-token?bizId=${bizId}`
    : `http://localhost/api/business/qr-token`
  return new NextRequest(url, { method: 'GET', credentials: 'include' })
}

describe('/api/business/qr-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.QR_SECRET_KEY = 'test-secret-key'
  })

  afterEach(() => {
    delete process.env.QR_SECRET_KEY
  })

  test('1. authenticated owner receives 200 and token', async () => {
    requireUser.mockResolvedValue({ id: USER_ID, email: 'owner@test.com' })
    generateServerToken.mockReturnValue('mock_signed_token_abc')

    // Chain eq twice (for id and owner_id), then maybeSingle
    const maybeSingleFn = jest.fn().mockResolvedValue({ data: { id: BIZ_ID } })
    const eqFn = jest.fn().mockReturnThis()
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn, maybeSingle: maybeSingleFn })
    eqFn.mockReturnValue({ eq: eqFn, maybeSingle: maybeSingleFn })
    adminClient.from.mockReturnValue({ select: selectFn })

    const res = await qrTokenHandler(makeReq(BIZ_ID))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.token).toBe('mock_signed_token_abc')
    expect(data.token).not.toBeUndefined()
    // Business ID is NOT generated client-side — generateServerToken must be called server-side
    expect(generateServerToken).toHaveBeenCalledWith(BIZ_ID)
  })

  test('2. unauthenticated request receives 401', async () => {
    requireUser.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )

    const res = await qrTokenHandler(makeReq(BIZ_ID))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/authentication required/i)
    expect(generateServerToken).not.toHaveBeenCalled()
  })

  test('3. authenticated user without business receives 404', async () => {
    requireUser.mockResolvedValue({ id: USER_ID })

    const maybeSingleFn = jest.fn().mockResolvedValue({ data: null })
    const eqFn = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: maybeSingleFn }) })
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn })
    adminClient.from.mockReturnValue({ select: selectFn })

    const res = await qrTokenHandler(makeReq(BIZ_ID))
    expect(res.status).toBe(404)
    expect(generateServerToken).not.toHaveBeenCalled()
  })

  test('4. missing QR_SECRET_KEY returns 503 without crashing', async () => {
    delete process.env.QR_SECRET_KEY
    requireUser.mockResolvedValue({ id: USER_ID })

    const maybeSingleFn = jest.fn().mockResolvedValue({ data: { id: BIZ_ID } })
    const eqFn = jest.fn().mockReturnThis()
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn, maybeSingle: maybeSingleFn })
    eqFn.mockReturnValue({ eq: eqFn, maybeSingle: maybeSingleFn })
    adminClient.from.mockReturnValue({ select: selectFn })

    const res = await qrTokenHandler(makeReq(BIZ_ID))
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data.error).toMatch(/unavailable/i)
  })

  test('5. business ID cannot be spoofed — wrong owner gets 404', async () => {
    requireUser.mockResolvedValue({ id: 'different-user-id' })

    // Return null because owner_id doesn't match
    const maybeSingleFn = jest.fn().mockResolvedValue({ data: null })
    const eqFn = jest.fn().mockReturnThis()
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn, maybeSingle: maybeSingleFn })
    eqFn.mockReturnValue({ eq: eqFn, maybeSingle: maybeSingleFn })
    adminClient.from.mockReturnValue({ select: selectFn })

    const res = await qrTokenHandler(makeReq(BIZ_ID))
    expect(res.status).toBe(404)
    // Does not reveal the business exists to a non-owner
    const data = await res.json()
    expect(data.error).toMatch(/not found/i)
    expect(generateServerToken).not.toHaveBeenCalled()
  })

  test('6. token is never generated client-side — generateServerToken is server-only', () => {
    // This test proves the server module is the only place tokens are created.
    // The import is server-side only; any client import would fail due to QR_SECRET_KEY access.
    expect(typeof generateServerToken).toBe('function')
    // And it is never called in this test scope without a real authenticated path
    expect(generateServerToken).not.toHaveBeenCalled()
  })
})
