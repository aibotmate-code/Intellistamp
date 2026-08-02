import { NextRequest, NextResponse } from 'next/server'
import { requireUser, adminClient } from '@/lib/auth'
import { generateServerToken } from '@/lib/server/token'

export async function GET(req: NextRequest) {
  // 1. Authenticate via session cookie (same pattern as /api/business/get)
  const user = await requireUser()
  if (user instanceof NextResponse) return user // propagates 401 cleanly

  try {
    const { searchParams } = new URL(req.url)
    const bizId = searchParams.get('bizId')

    // 2. Resolve and authorize the business server-side from the authenticated user.
    //    A caller-supplied bizId is verified against owner_id — it cannot be spoofed.
    const sessionPresent = true
    const userIdPresent = Boolean(user.id)

    let businessFound = false
    const qrSecretConfigured = Boolean(process.env.QR_SECRET_KEY)

    // Safe Vercel diagnostics — never log the secret, token, or cookies
    console.log('[qr-token] sessionPresent:', sessionPresent, 'userIdPresent:', userIdPresent, 'qrSecretConfigured:', qrSecretConfigured)

    if (!bizId) {
      // Auto-resolve: look up the business owned by this user (no bizId needed)
      const { data: business } = await adminClient
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      businessFound = Boolean(business)
      console.log('[qr-token] businessFound (auto-resolve):', businessFound)

      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }

      if (!qrSecretConfigured) {
        console.error('[qr-token] QR_SECRET_KEY is not configured')
        return NextResponse.json({ error: 'QR token generation unavailable' }, { status: 503 })
      }

      const token = generateServerToken(business.id)
      if (!token) {
        return NextResponse.json({ error: 'QR token generation failed' }, { status: 500 })
      }

      return NextResponse.json({ token, bizId: business.id })
    }

    // bizId supplied: verify ownership before using it
    const { data: business } = await adminClient
      .from('businesses')
      .select('id')
      .eq('id', bizId)
      .eq('owner_id', user.id)
      .maybeSingle()

    businessFound = Boolean(business)
    console.log('[qr-token] businessFound (by bizId):', businessFound)

    if (!business) {
      // Return 404 (not 403) to avoid confirming a business exists to non-owners
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (!qrSecretConfigured) {
      console.error('[qr-token] QR_SECRET_KEY is not configured')
      return NextResponse.json({ error: 'QR token generation unavailable' }, { status: 503 })
    }

    const token = generateServerToken(bizId)
    if (!token) {
      return NextResponse.json({ error: 'QR token generation failed' }, { status: 500 })
    }

    return NextResponse.json({ token })
  } catch (err) {
    console.error('[qr-token] unexpected error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
