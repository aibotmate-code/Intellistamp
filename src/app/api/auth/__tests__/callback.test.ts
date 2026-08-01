/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auth callback route tests — /api/auth/callback
 *
 * Verifies: code exchange, error handling, redirect targets,
 * open-redirect prevention, and safe error states.
 */
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockExchangeResult: { error: { message: string } | null } = { error: null }
let mockSessionResult: { data: { session: any } } = { data: { session: null } }

const mockAuth = {
  exchangeCodeForSession: jest.fn(async () => mockExchangeResult),
  getSession: jest.fn(async () => mockSessionResult),
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerClient: jest.fn(() => ({ auth: mockAuth })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    getAll: () => [],
    set: jest.fn(),
  })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../callback/route')

beforeEach(() => {
  jest.clearAllMocks()
  mockExchangeResult = { error: null }
  mockSessionResult = { data: { session: { user: { id: 'u1', aud: 'authenticated' } } } }
  mockAuth.exchangeCodeForSession.mockImplementation(async () => mockExchangeResult)
  mockAuth.getSession.mockImplementation(async () => mockSessionResult)
})

// ---------------------------------------------------------------------------
// Test 15: Missing code → safe error redirect (not a crash)
// ---------------------------------------------------------------------------
describe('GET /api/auth/callback — missing code', () => {
  test('missing ?code redirects to /login?error=missing_code', async () => {
    const res = await GET(makeGet('http://localhost/api/auth/callback'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=missing_code')
  })
})

// ---------------------------------------------------------------------------
// Test 16: Invalid/expired exchange → /reset-password?error=expired
// ---------------------------------------------------------------------------
describe('GET /api/auth/callback — invalid exchange', () => {
  test('exchange error redirects to /reset-password?error=expired', async () => {
    mockExchangeResult = { error: { message: 'invalid or expired token' } }
    const res = await GET(makeGet('http://localhost/api/auth/callback?code=bad-code'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/reset-password?error=expired')
  })
})

// ---------------------------------------------------------------------------
// Test 17: Open redirect prevention
// ---------------------------------------------------------------------------
describe('GET /api/auth/callback — no open redirects', () => {
  test('recovery code exchange always goes to /reset-password (not external URL)', async () => {
    const res = await GET(makeGet('http://localhost/api/auth/callback?code=good-code'))
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/reset-password')
    expect(location).not.toMatch(/^https?:\/\/(?!localhost)/)
  })
})

// ---------------------------------------------------------------------------
// Test 18: Relative next param — no longer used in simplified route
// ---------------------------------------------------------------------------
describe('GET /api/auth/callback — no next param in simplified route', () => {
  test('successful code exchange always redirects to /reset-password', async () => {
    const res = await GET(makeGet('http://localhost/api/auth/callback?code=valid-code'))
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/reset-password')
    expect(location).not.toContain('error=')
  })
})

// ---------------------------------------------------------------------------
// Test 19: Recovery exchange routes to /reset-password
// ---------------------------------------------------------------------------
describe('GET /api/auth/callback — recovery to reset-password', () => {
  test('successful exchange redirects to /reset-password', async () => {
    const res = await GET(makeGet('http://localhost/api/auth/callback?code=recovery-code'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/reset-password$/)
  })
})

// ---------------------------------------------------------------------------
// Test 20: Catch-all error handling
// ---------------------------------------------------------------------------
describe('GET /api/auth/callback — catch-all safety', () => {
  test('unexpected throw redirects to /login?error=callback_failed', async () => {
    mockAuth.exchangeCodeForSession.mockRejectedValueOnce(new Error('network'))
    const res = await GET(makeGet('http://localhost/api/auth/callback?code=any-code'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=callback_failed')
  })
})
