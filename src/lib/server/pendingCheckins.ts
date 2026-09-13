import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

function getPollingTokenSecret(): string {
  const secret =
    process.env.ACCESS_GRANT_SECRET ||
    process.env.QR_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Server token secret is not configured')
  }
  return secret
}

/**
 * Extracts canonical stamp ID from issue_stamp_atomic response shape.
 * Handles both { stamp: { id: "..." } } and fallback { id: "..." }.
 */
export function extractStampId(stampResult: Record<string, unknown> | null | undefined): string | null {
  if (!stampResult) return null
  if (
    typeof stampResult.stamp === 'object' &&
    stampResult.stamp !== null &&
    'id' in stampResult.stamp
  ) {
    return String((stampResult.stamp as { id: unknown }).id)
  }
  if ('id' in stampResult && typeof stampResult.id === 'string') {
    return stampResult.id
  }
  return null
}

/**
 * Generates a server-signed short-lived polling token bound to:
 * - checkin_id
 * - business_id
 * - customer_id
 * - expiry (defaults to 5 minutes)
 * 
 * Does NOT expose customer_id in the wire payload.
 */
export function generatePollingToken(params: {
  checkin_id: string
  business_id: string
  customer_id: string
  ttlMs?: number
}): string {
  const secret = getPollingTokenSecret()
  const now = Date.now()
  const expiresAt = now + (params.ttlMs || 5 * 60 * 1000)
  const nonce = crypto.randomBytes(8).toString('hex')

  // Wire payload: version:poll:checkin_id:business_id:expiresAt:nonce
  const payload = `1:poll:${params.checkin_id}:${params.business_id}:${expiresAt}:${nonce}`

  // HMAC binds customer_id cryptographically without exposing it over the wire
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${payload}:${params.customer_id}`)
  const signature = hmac.digest('hex').slice(0, 32)

  const dataB64 = Buffer.from(payload).toString('base64url')
  return `${dataB64}.${signature}`
}

/**
 * Cryptographically verifies that the polling token is authentic, unexpired,
 * and belongs to the specified checkin_id, business_id, and customer_id.
 */
export function verifyPollingToken(
  token: string,
  checkin_id: string,
  business_id: string,
  customer_id: string
): boolean {
  try {
    const secret = getPollingTokenSecret()
    if (!token || typeof token !== 'string') return false

    const [dataB64, signature] = token.split('.')
    if (!dataB64 || !signature || signature.length !== 32) return false

    const payload = Buffer.from(dataB64, 'base64url').toString('utf-8')
    const parts = payload.split(':')
    if (parts.length !== 6) return false

    const [version, purpose, tokenCheckinId, tokenBizId, expiresAtStr] = parts
    if (version !== '1' || purpose !== 'poll') return false
    if (tokenCheckinId !== checkin_id || tokenBizId !== business_id) return false

    const expiresAt = parseInt(expiresAtStr, 10)
    const now = Date.now()
    if (isNaN(expiresAt) || expiresAt <= now) return false
    if (expiresAt > now + 10 * 60 * 1000) return false

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(`${payload}:${customer_id}`)
    const expectedSignature = hmac.digest('hex').slice(0, 32)

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    )
  } catch {
    return false
  }
}

/**
 * Creates a durable pending check-in record in PostgreSQL.
 * Defaults to 5-minute TTL managed by the database.
 * Also generates and returns a signed short-lived polling token.
 */
export async function createPendingCheckin(
  params: {
    business_id: string
    customer_id: string
  },
  client?: SupabaseClient
): Promise<{ checkin: PendingCheckinRecord | null; poll_token?: string; error?: string }> {
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

    const checkin = data as PendingCheckinRecord
    const poll_token = generatePollingToken({
      checkin_id: checkin.id,
      business_id: checkin.business_id,
      customer_id: checkin.customer_id,
    })

    return { checkin, poll_token }
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

    if (rpcErr && rpcErr.code !== '42883') {
      return { success: false, error: rpcErr.message }
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
        result_stamp_id: extractStampId(stampResult),
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
        result_stamp_id: extractStampId(stamp_result),
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
