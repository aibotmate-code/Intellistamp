import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface PendingCheckinRecord {
  id: string
  business_id: string
  customer_id: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  created_at: string
  expires_at: string
  approved_at?: string | null
  approved_by?: string | null
  result_stamp_id?: string | null
  result_payload?: Record<string, unknown> | null
  customers?: {
    phone: string
    name?: string | null
  } | null
}

function getSupabaseClient(client?: SupabaseClient): SupabaseClient {
  if (client) return client
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Creates a durable pending check-in record in PostgreSQL.
 * Defaults to 5-minute TTL managed by the database.
 */
export async function createPendingCheckin(
  params: {
    business_id: string
    customer_id: string
  },
  client?: SupabaseClient
): Promise<{ checkin: PendingCheckinRecord | null; error?: string }> {
  const supabase = getSupabaseClient(client)

  try {
    const { data, error } = await supabase
      .from('pending_checkins')
      .insert({
        business_id: params.business_id,
        customer_id: params.customer_id,
        status: 'pending',
      })
      .select('id, business_id, customer_id, status, created_at, expires_at')
      .single()

    if (error) {
      return { checkin: null, error: error.message }
    }

    return { checkin: data as PendingCheckinRecord }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error creating check-in'
    return { checkin: null, error: message }
  }
}

/**
 * Retrieves a pending check-in status for a customer with strict tenant verification.
 * Automatically marks the check-in as expired if its TTL has elapsed.
 */
export async function getPendingCheckinStatus(
  checkin_id: string,
  business_id: string,
  client?: SupabaseClient
): Promise<{
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'not_found'
  record?: PendingCheckinRecord
}> {
  const supabase = getSupabaseClient(client)

  try {
    const { data, error } = await supabase
      .from('pending_checkins')
      .select('id, business_id, customer_id, status, created_at, expires_at, approved_at, result_stamp_id, result_payload')
      .eq('id', checkin_id)
      .eq('business_id', business_id)
      .single()

    if (error || !data) {
      return { status: 'not_found' }
    }

    const record = data as PendingCheckinRecord
    const now = Date.now()
    const expiresAt = new Date(record.expires_at).getTime()

    // Check expiration
    if (record.status === 'pending' && now >= expiresAt) {
      await supabase
        .from('pending_checkins')
        .update({ status: 'expired' })
        .eq('id', checkin_id)
        .eq('status', 'pending')

      record.status = 'expired'
      return { status: 'expired', record }
    }

    return { status: record.status, record }
  } catch {
    return { status: 'not_found' }
  }
}

/**
 * Returns all active pending check-ins for a business with customer phone/name joined from customers table.
 */
export async function getPendingCheckinsForBusiness(
  business_id: string,
  client?: SupabaseClient
): Promise<PendingCheckinRecord[]> {
  const supabase = getSupabaseClient(client)
  const nowIso = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from('pending_checkins')
      .select(`
        id,
        business_id,
        customer_id,
        status,
        created_at,
        expires_at,
        customers (
          phone,
          name
        )
      `)
      .eq('business_id', business_id)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as unknown as PendingCheckinRecord[]
  } catch {
    return []
  }
}

/**
 * Atomically approves a pending check-in using the approve_pending_checkin RPC function.
 * Ensures row-locking, single approval, expiration checking, and atomic stamp issuance.
 */
export async function approvePendingCheckin(
  checkin_id: string,
  business_id: string,
  approved_by?: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string; stamp_result?: Record<string, unknown> | null }> {
  const supabase = getSupabaseClient(client)

  try {
    // Attempt database-level atomic RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_pending_checkin', {
      p_checkin_id: checkin_id,
      p_business_id: business_id,
      p_approved_by: approved_by || null,
    })

    if (!rpcErr && rpcRes) {
      if (rpcRes.error) {
        return { success: false, error: rpcRes.error }
      }
      return { success: true, stamp_result: rpcRes.stamp_result }
    }

    // Fallback if RPC is not yet registered on environment:
    // 1. Verify existence & pending status
    const { data: checkin, error: chkErr } = await supabase
      .from('pending_checkins')
      .select('id, customer_id, business_id, status, expires_at')
      .eq('id', checkin_id)
      .eq('business_id', business_id)
      .single()

    if (chkErr || !checkin) {
      return { success: false, error: 'Check-in request not found' }
    }

    if (checkin.status !== 'pending') {
      return { success: false, error: `Check-in already ${checkin.status}` }
    }

    if (new Date(checkin.expires_at).getTime() <= Date.now()) {
      await supabase.from('pending_checkins').update({ status: 'expired' }).eq('id', checkin_id)
      return { success: false, error: 'Check-in request expired' }
    }

    // 2. Issue stamp atomically using canonical issue_stamp_atomic RPC
    const { data: stampResult, error: stampErr } = await supabase.rpc('issue_stamp_atomic', {
      p_customer_id: checkin.customer_id,
      p_business_id: business_id,
      p_type: 'regular',
      p_stamp_token: null,
    })

    if (stampErr || !stampResult || stampResult.error) {
      return { success: false, error: stampResult?.error || stampErr?.message || 'Failed to issue stamp' }
    }

    // 3. Conditional update to approved (ensures single approval)
    const { data: updated, error: updErr } = await supabase
      .from('pending_checkins')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approved_by || null,
        result_stamp_id: stampResult.id || null,
        result_payload: stampResult,
      })
      .eq('id', checkin_id)
      .eq('business_id', business_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .select('id')
      .single()

    if (updErr || !updated) {
      return { success: false, error: 'Check-in already processed or expired' }
    }

    return { success: true, stamp_result: stampResult }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error approving check-in'
    return { success: false, error: message }
  }
}

/**
 * Resolves any active pending check-in for a customer when a stamp is issued from kiosk.
 */
export async function resolvePendingCheckinForCustomer(
  business_id: string,
  customer_id: string,
  stamp_result: Record<string, unknown> | null | undefined,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = getSupabaseClient(client)
  const nowIso = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from('pending_checkins')
      .update({
        status: 'approved',
        approved_at: nowIso,
        result_stamp_id: stamp_result?.id || null,
        result_payload: stamp_result,
      })
      .eq('business_id', business_id)
      .eq('customer_id', customer_id)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .select('id')

    return !error && Boolean(data && data.length > 0)
  } catch {
    return false
  }
}
