import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { businessCreateSchema } from '@/lib/validators'
import { hashPin } from '@/lib/pinHash'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Get the authenticated user from the session cookie
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in this handler */ },
      },
    }
  )
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const ownerId = session.user.id

  try {
    const body = await req.json()
    if (typeof body.owner_phone === 'string') {
      body.owner_phone = body.owner_phone.replace(/^\+91/, '')
    }

    const result = businessCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = result.data

    let slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (!slug) slug = 'business'

    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`
    }

    const pinHash = await hashPin(data.staff_pin)

    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        name: data.name,
        category: data.category,
        emoji: data.emoji,
        stamps_required: data.stamps_required,
        reward: data.reward,
        staff_pin: data.staff_pin,
        staff_pin_hash: pinHash,
        gmb_link: data.gmb_link || null,
        dynamic_qr_enabled: data.dynamic_qr_enabled,
        staff_pin_enabled: data.staff_pin_enabled,
        owner_phone: data.owner_phone,
        whatsapp_enabled: false,
        plan: 'free',
        slug,
        ...(ownerId ? { owner_id: ownerId } : {}),
      })
      .select()
      .single()

    if (error || !business) {
      return NextResponse.json({ error: 'Failed to create business. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, business })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
