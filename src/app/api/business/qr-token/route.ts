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


    if (!bizId) {
      // Auto-resolve: look up the business owned by this user (no bizId needed)
      const { data: business } = await adminClient
        .from('businesses')
        .select('id, approval_status, plan_expires_at')
        .eq('owner_id', user.id)
        .maybeSingle()

      businessFound = Boolean(business)


      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }
      
      if (business.approval_status !== 'approved') {
        return NextResponse.json({ error: `Business is ${business.approval_status}` }, { status: 403 })
      }
      
      if (business.plan_expires_at && new Date(business.plan_expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Plan expired' }, { status: 403 })
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
      .select('id, approval_status, plan_expires_at')
      .eq('id', bizId)
      .eq('owner_id', user.id)
      .maybeSingle()

    businessFound = Boolean(business)


    if (!business) {
      // Return 404 (not 403) to avoid confirming a business exists to non-owners
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    if (business.approval_status !== 'approved') {
      return NextResponse.json({ error: `Business is ${business.approval_status}` }, { status: 403 })
    }
    
    if (business.plan_expires_at && new Date(business.plan_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Plan expired' }, { status: 403 })
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
