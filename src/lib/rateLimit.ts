import { NextResponse, NextRequest } from 'next/server'

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
    // Basic normalization/validation for IPv4 or IPv6
    // Reject anything too long or containing bizarre characters
    if (ip.length <= 45 && /^[a-fA-F0-9.:]+$/.test(ip)) {
      return ip
    }
  }
  
  return '127.0.0.1' // Stable fallback
}
export interface RateLimitResult {
  ok: boolean
  retryAfter?: number
}

import { createClient } from '@supabase/supabase-js'

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
    return { ok: true } // Fail open on DB errors
  }
  
  return {
    ok: data.ok,
    retryAfter: data.retry_after
  }
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
