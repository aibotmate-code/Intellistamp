import { NextResponse } from 'next/server'

export interface RateLimitResult {
  ok: boolean
  retryAfter?: number
}

interface Entry { count: number; resetAt: number }

class InMemoryRateLimiter {
  private store = new Map<string, Entry>()

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs })
      return { ok: true }
    }

    if (entry.count >= limit) {
      return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
    }

    entry.count++
    return { ok: true }
  }
}

// Module-scope singleton — shared across requests on the same warm serverless instance.
// In production with multiple instances each keeps its own counter; limits are approximate.
// Swap for an Upstash Redis adapter when hard per-user enforcement is required.
export const rateLimiter = new InMemoryRateLimiter()

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
