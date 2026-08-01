import { NextRequest } from 'next/server'
import { getClientIp, checkRateLimit, generateHmacIdentity } from '../rateLimit'
import crypto from 'crypto'

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
    process.env.RATE_LIMIT_KEY_SECRET = 'test_secret_do_not_use_in_prod'
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

    test('IP Helper: valid IPv4 accepted', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({ 'x-vercel-forwarded-for': '192.168.1.1' })
      })
      expect(getClientIp(req)).toBe('192.168.1.1')
    })

    test('IP Helper: valid IPv6 accepted and normalized', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({ 'x-vercel-forwarded-for': '[2001:db8::1]' })
      })
      expect(getClientIp(req)).toBe('2001:db8::1')
    })

    test('IP Helper: IPv4-mapped IPv6 is normalized', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({ 'x-vercel-forwarded-for': '::ffff:192.0.2.128' })
      })
      expect(getClientIp(req)).toBe('192.0.2.128')
    })

    test('IP Helper: rejects malformed pseudo-IP and falls back', () => {
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-forwarded-for': 'drop table users;--'
        })
      })
      expect(getClientIp(req)).toBe('unknown-client')
    })

    test('IP Helper: rejects oversized IP string', () => {
      const oversized = '1'.repeat(50)
      const req = new NextRequest('http://localhost', {
        headers: new Headers({
          'x-vercel-forwarded-for': oversized
        })
      })
      expect(getClientIp(req)).toBe('unknown-client')
    })

    test('IP Helper: returns stable fallback unknown-client when missing', () => {
      const req = new NextRequest('http://localhost')
      expect(getClientIp(req)).toBe('unknown-client')
    })
  })

  describe('[MOCKED TESTS] HMAC Identity Generation', () => {
    test('generateHmacIdentity produces stable truncated hashes', () => {
      const hash1 = generateHmacIdentity('ip', '1.1.1.1')
      const hash2 = generateHmacIdentity('ip', '1.1.1.1')
      expect(hash1).toBe(hash2)
      expect(hash1.length).toBe(32)
      expect(hash1).not.toContain('1.1.1.1') // Raw IP is absent
    })

    test('different prefixes separate domains', () => {
      const hashIp = generateHmacIdentity('ip', '1.1.1.1')
      const hashPhone = generateHmacIdentity('phone', '1.1.1.1')
      expect(hashIp).not.toBe(hashPhone)
    })
  })

  describe('[MOCKED TESTS] TS Wrapper logic & Fail-Closed', () => {
    test('limiter RPC failure fails closed (blocks PIN verification, recovery, etc.)', async () => {
      smocks.mockRpc.mockResolvedValueOnce({ data: null, error: new Error('DB Error') })
      const res = await checkRateLimit('test_key', 5, 60)
      expect(res.ok).toBe(false)
      expect(res.isError).toBe(true)
      expect(res.retryAfter).toBe(60) // Fails closed, temporary backoff
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
    // These tests map directly to the migration SQL logic requirements
    test.todo('first request allowed')
    test.todo('exact limit boundary (limit requests allowed)')
    test.todo('limit + 1 rejection (limit + 1 blocked)')
    test.todo('expired window resets count to 1')
    test.todo('concurrent UPSERT behavior stays within limit (using pg_advisory_xact_lock / FOR UPDATE)')
    test.todo('invalid key rejected (length > 256 or empty)')
    test.todo('invalid limit rejected (outside 1..1000)')
    test.todo('invalid window rejected (outside 1..86400)')
    test.todo('retry_after never negative')
    test.todo('count capped at limit + 1 in the database')
    
    // Isolation requirements at the database key level
    test.todo('one attacker IP cannot lock all other IPs for a business (appended client hash isolates rows)')
    test.todo('the same IP is isolated between businesses (business_id in key)')
    test.todo('stamp, kiosk, review, and lookup actions have separate scopes (action prefixes in keys)')
    
    // Cleanup behavior
    test.todo('cleanup orders by oldest reset_at first')
    test.todo('cleanup removes only expired rows (reset_at < now() - 1 day)')
    test.todo('cleanup remains batch-limited (p_batch_size)')
    
    // Permissions
    test.todo('anon cannot execute (Permission denied)')
    test.todo('authenticated cannot execute (Permission denied)')
    test.todo('service_role can execute')
    test.todo('direct table access blocked for all (RLS enabled, no policies)')
    
    // Upgrade and Failure-only PIN behavior
    test.todo('old three-column table upgrade preserves existing rows')
    test.todo('null-value backfill correctly replaces nulls with 0 and expired timestamps')
    test.todo('count default becomes 0 and both count/reset_at become NOT NULL')
    test.todo('constraint check is table-specific')
    test.todo('valid PIN attempts do not trigger brute-force lockout, failure-only design')
    test.todo('failed PIN attempts do trigger lockout')
    test.todo('successful PIN clears only its exact failure key via reset_rate_limit')
    test.todo('unknown-client remains separated by action and business')
  })
})
