import { NextRequest, NextResponse } from 'next/server'
import { requireUser, adminClient, buildAuthClient } from '@/lib/auth'
import { hashPin, verifyPin } from '@/lib/pinHash'
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const userOrError = await requireUser()
    if (userOrError instanceof NextResponse) return userOrError
    const user = userOrError

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { action, current_pin, new_pin, confirm_pin, account_password } = body

    if (!['set', 'change', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!new_pin || !confirm_pin || new_pin !== confirm_pin) {
      return NextResponse.json({ error: 'New PIN and confirmation do not match' }, { status: 400 })
    }

    if (!/^\d{4}$/.test(new_pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    // Resolve business server-side (ignoring any client business_id)
    const { data: businesses, error: bizError } = await adminClient
      .from('businesses')
      .select('id, plan, staff_pin_hash, approval_status, plan_expires_at')
      .eq('owner_id', user.id)
      .limit(1)

    if (bizError || !businesses || businesses.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const business = businesses[0]

    if (business.approval_status !== 'approved') {
      return NextResponse.json({ error: `Business is ${business.approval_status}` }, { status: 403 })
    }
    
    if (business.plan_expires_at && new Date(business.plan_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Plan expired' }, { status: 403 })
    }

    if (business.plan === 'free') {
      return NextResponse.json({ error: 'Staff PIN feature requires Pro plan' }, { status: 403 })
    }

    if (action === 'set') {
      if (business.staff_pin_hash) {
        return NextResponse.json({ error: 'PIN already exists' }, { status: 400 })
      }

      const pinHash = await hashPin(new_pin)
      const { error: updateError } = await adminClient
        .from('businesses')
        .update({ staff_pin_hash: pinHash })
        .eq('id', business.id)

      if (updateError) throw updateError
      return NextResponse.json({ success: true })
    }

    if (action === 'change') {
      if (!business.staff_pin_hash) {
        return NextResponse.json({ error: 'No PIN exists to change' }, { status: 400 })
      }

      if (!current_pin || !/^\d{4}$/.test(current_pin)) {
        return NextResponse.json({ error: 'Current PIN required' }, { status: 400 })
      }

      const rateLimitKey = `pin_change_${business.id}`
      const limit = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)
      if (!limit.ok) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 900) } }
        )
      }

      const isValid = await verifyPin(current_pin, business.staff_pin_hash)
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect current PIN' }, { status: 400 })
      }

      const pinHash = await hashPin(new_pin)
      const { error: updateError } = await adminClient
        .from('businesses')
        .update({ staff_pin_hash: pinHash })
        .eq('id', business.id)

      if (updateError) throw updateError
      await resetRateLimit(rateLimitKey)
      return NextResponse.json({ success: true })
    }

    if (action === 'reset') {
      if (!account_password) {
        return NextResponse.json({ error: 'Account password required for reset' }, { status: 400 })
      }

      if (!user.email) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 })
      }

      const rateLimitKey = `pin_reset_${user.id}`
      const limit = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)
      if (!limit.ok) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 900) } }
        )
      }

      const supabase = await buildAuthClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: account_password
      })

      if (authError) {
        return NextResponse.json({ error: 'Invalid account password' }, { status: 400 })
      }

      const pinHash = await hashPin(new_pin)
      const { error: updateError } = await adminClient
        .from('businesses')
        .update({ staff_pin_hash: pinHash })
        .eq('id', business.id)

      if (updateError) throw updateError
      
      console.log(`[AUDIT] Business ${business.id} PIN reset successfully by owner ${user.id}`)
      await resetRateLimit(rateLimitKey)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
