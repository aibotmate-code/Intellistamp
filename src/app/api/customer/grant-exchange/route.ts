import { NextRequest, NextResponse } from 'next/server'
import { validateAccessGrant } from '@/lib/server/grant'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const grant = searchParams.get('grant')
    const bizId = searchParams.get('bizId')

    if (!grant || !bizId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const customerId = validateAccessGrant(grant, bizId)
    if (!customerId) {
      return NextResponse.redirect(new URL(`/scan/${bizId}`, req.url))
    }

    const res = NextResponse.redirect(new URL(`/card-access/${bizId}`, req.url))
    
    res.cookies.set(`card_access_${bizId}`, grant, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/'
    })

    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.headers.set('Referrer-Policy', 'no-referrer')

    return res
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
