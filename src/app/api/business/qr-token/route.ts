import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateServerToken } from '@/lib/server/token'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const bizId = searchParams.get('bizId')

    if (!bizId) {
      return NextResponse.json({ error: 'bizId is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the user is the owner of the business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', bizId)
      .eq('owner_id', session.user.id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = generateServerToken(bizId)

    return NextResponse.json({ token })
  } catch (err) {
    console.error('qr-token error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
