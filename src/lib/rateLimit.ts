import { NextResponse, NextRequest } from 'next/server'

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Extract the first IP address from a comma-separated list
    // Vercel trusts the immediate connection but clients can spoof earlier IPs
    // We strictly parse the first segment.
    const firstSegment = forwardedFor.split(',')[0].trim()
    // Basic validation for IPv4 or IPv6 format to reject malformed/arbitrary spoofing
    if (/^[a-fA-F0-9.:]+$/.test(firstSegment)) {
      return firstSegment
    }
  }
  
  return 'unknown'
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
  
  return data
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
