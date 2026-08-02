import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import net from 'net'
import crypto from 'crypto'

export function getClientIp(req: NextRequest): string {
  // Prefer Vercel trusted IP header
  let ip = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-real-ip')
  
  if (!ip) {
    const forwardedFor = req.headers.get('x-forwarded-for')
    if (forwardedFor) {
      ip = forwardedFor.split(',')[0].trim()
    }
  }

  if (ip) {
    // IPv6 could be enclosed in brackets e.g., [::1]
    ip = ip.replace(/^\[|\]$/g, '').trim()

    // Normalize IPv4-mapped IPv6
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7)
    }

    if (ip.length <= 45 && net.isIP(ip)) {
      return ip
    }
  }
  
  return 'unknown-client' // Stable fallback
}

export function generateHmacIdentity(prefix: string, value: string): string {
  const secret = process.env.RATE_LIMIT_KEY_SECRET
  if (!secret) {
    throw new Error('RATE_LIMIT_KEY_SECRET is not configured')
  }
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${prefix}|${value}`)
  return hmac.digest('hex').substring(0, 32)
}

export interface RateLimitResult {
  ok: boolean
  retryAfter?: number
  isError?: boolean
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: Math.floor(windowMs / 1000)
  })
  
  if (error || !data) {
    console.error('Rate limit DB error:', error)
    // FAIL CLOSED: if DB fails, do not allow unlimited access
    return { ok: false, retryAfter: 60, isError: true } // Default temporary backoff on error
  }
  
  return {
    ok: data.ok,
    retryAfter: data.retry_after
  }
}

export async function peekRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('rate_limits')
    .select('count, reset_at')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    console.error('Rate limit peek DB error:', error)
    return { ok: false, retryAfter: 60, isError: true } // Fail closed
  }

  if (data && data.count >= limit && new Date(data.reset_at) > new Date()) {
    const retryAfter = Math.ceil((new Date(data.reset_at).getTime() - Date.now()) / 1000)
    return { ok: false, retryAfter: Math.max(0, retryAfter) }
  }

  return { ok: true }
}

export async function resetRateLimit(key: string): Promise<{ ok: boolean, isError?: boolean }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await supabase.rpc('reset_rate_limit', { p_key: key })
  if (error) {
    console.error('Rate limit reset DB error:', error)
    return { ok: false, isError: true }
  }
  return { ok: true }
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

export function rateLimitErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Service temporarily unavailable.' },
    { status: 503, headers: { 'Retry-After': '60' } }
  )
}
