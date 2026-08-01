import { NextRequest } from 'next/server'
import { getClientIp, checkRateLimit } from '../rateLimit'

// @ts-expect-error Mocked module injection
import { __mocks as smocks } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js', () => {
  const mockRpc = jest.fn()
  const mockSupabase = { rpc: mockRpc }
  return {
    createClient: () => mockSupabase,
    __mocks: { mockRpc }
  }
})

describe('Rate Limit & IP Extraction Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('[MOCKED TESTS] Client IP Helper', () => {
    test('IP Helper: prefers x-vercel-forwarded-for over others', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-vercel-forwarded-for': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-forwarded-for': '3.3.3.3, 4.4.4.4'
        })
      })
      expect(getClientIp(req)).toBe('1.1.1.1')
    })

    test('IP Helper: falls back to x-real-ip', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-real-ip': '2.2.2.2',
          'x-forwarded-for': '3.3.3.3, 4.4.4.4'
        })
      })
      expect(getClientIp(req)).toBe('2.2.2.2')
    })

    test('IP Helper: takes first valid segment of x-forwarded-for', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-forwarded-for': '  3.3.3.3  , 4.4.4.4'
        })
      })
      expect(getClientIp(req)).toBe('3.3.3.3')
    })

    test('IP Helper: rejects malformed IP and falls back', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-forwarded-for': 'drop table users;--'
        })
      })
      expect(getClientIp(req)).toBe('127.0.0.1')
    })

    test('IP Helper: rejects oversized IP string', () => {
      const oversized = '1'.repeat(50)
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-vercel-forwarded-for': oversized
        })
      })
      expect(getClientIp(req)).toBe('127.0.0.1')
    })

    test('IP Helper: returns stable fallback when missing', () => {
      const req = new NextRequest('http://localhost')
      expect(getClientIp(req)).toBe('127.0.0.1')
    })
  })

  describe('[MOCKED TESTS] TS Wrapper logic', () => {
    test('Wrapper fails open on DB error', async () => {
      smocks.mockRpc.mockResolvedValueOnce({ data: null, error: new Error('DB Error') })
      const res = await checkRateLimit('test_key', 5, 60)
      expect(res.ok).toBe(true) // fails open to not block traffic
    })

    test('Wrapper correctly passes arguments to RPC', async () => {
      smocks.mockRpc.mockResolvedValueOnce({ data: { ok: false, retry_after: 10 }, error: null })
      const res = await checkRateLimit('test_key', 5, 60000)
      expect(smocks.mockRpc).toHaveBeenCalledWith('check_rate_limit', {
        p_key: 'test_key',
        p_limit: 5,
        p_window_seconds: 60
      })
      expect(res.ok).toBe(false)
      expect(res.retryAfter).toBe(10)
    })
  })

  describe('[REAL POSTGRESQL TESTS - TO BE EXECUTED AFTER MIGRATION]', () => {
    // We declare these as skip/todo since the migration is not yet executed locally/staging during this CI run
    test.todo('first request allowed')
    test.todo('exactly limit requests allowed')
    test.todo('limit + 1 blocked')
    test.todo('expired window resets')
    test.todo('concurrent calls stay within limit (using pg_advisory_xact_lock / FOR UPDATE)')
    test.todo('invalid key rejected (length > 256 or empty)')
    test.todo('oversized key rejected')
    test.todo('invalid limit rejected (outside 1..1000)')
    test.todo('invalid window rejected (outside 1..86400)')
    test.todo('retry_after non-negative')
    test.todo('count capped at limit + 1')
    test.todo('business isolation (different keys do not overlap)')
    test.todo('IP isolation (different IP keys do not overlap)')
    test.todo('cleanup removes only expired rows (reset_at < now() - 1 day)')
    test.todo('cleanup respects batch limit (p_batch_size)')
    test.todo('anon cannot execute (Permission denied)')
    test.todo('authenticated cannot execute (Permission denied)')
    test.todo('service_role can execute')
    test.todo('direct table access blocked for all (RLS enabled, no policies)')
    test.todo('no sensitive values in stored keys (app level key formatting)')
  })
})
