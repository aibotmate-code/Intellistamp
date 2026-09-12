import type { StampCardState, RewardResult } from '@/types'
import crypto from 'crypto'

export interface CheckinResult {
  card_state: StampCardState
  reward_result?: RewardResult | null
  access_grant?: unknown
  stamped_at?: string
  new_stamp_index?: number
}

export interface PendingCheckin {
  checkin_id: string
  business_id: string
  customer_id: string
  customer_name?: string
  phone: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  created_at: number
  expires_at: number
  result?: CheckinResult
}

// TTL: 5 minutes for pending check-ins
const CHECKIN_TTL_MS = 5 * 60 * 1000

// In-memory store (keyed by checkin_id)
const checkinStore = new Map<string, PendingCheckin>()

/**
 * Prunes expired check-in records to prevent memory growth.
 */
function pruneExpiredCheckins(): void {
  const now = Date.now()
  for (const [id, checkin] of checkinStore.entries()) {
    if (now > checkin.expires_at) {
      checkinStore.delete(id)
    }
  }
}

/**
 * Creates a new pending check-in for static QR + staff PIN mode.
 * Generates a unique checkin_id and enforces tenant isolation.
 */
export function createPendingCheckin(params: {
  business_id: string
  customer_id: string
  customer_name?: string
  phone: string
}): PendingCheckin {
  pruneExpiredCheckins()

  const checkin_id = `chk_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  const now = Date.now()

  const checkin: PendingCheckin = {
    checkin_id,
    business_id: params.business_id,
    customer_id: params.customer_id,
    customer_name: params.customer_name,
    phone: params.phone,
    status: 'pending',
    created_at: now,
    expires_at: now + CHECKIN_TTL_MS,
  }

  checkinStore.set(checkin_id, checkin)
  return checkin
}

/**
 * Retrieves a pending check-in with strict tenant verification.
 */
export function getPendingCheckin(checkin_id: string, business_id: string): PendingCheckin | null {
  pruneExpiredCheckins()
  const checkin = checkinStore.get(checkin_id)
  if (!checkin) return null

  // Strict tenant boundary check
  if (checkin.business_id !== business_id) {
    return null
  }

  return checkin
}

/**
 * Returns all active pending check-ins for a business (for merchant counter UI).
 */
export function getPendingCheckinsForBusiness(business_id: string): PendingCheckin[] {
  pruneExpiredCheckins()
  const list: PendingCheckin[] = []
  for (const checkin of checkinStore.values()) {
    if (checkin.business_id === business_id && checkin.status === 'pending') {
      list.push(checkin)
    }
  }
  return list.sort((a, b) => b.created_at - a.created_at)
}

/**
 * Resolves pending check-ins for a given customer phone and business.
 * Called when a merchant issues a stamp via kiosk or manual approval.
 */
export function resolvePendingCheckinByPhone(
  business_id: string,
  phone: string,
  result: CheckinResult
): boolean {
  pruneExpiredCheckins()
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '')
  let matched = false

  for (const checkin of checkinStore.values()) {
    const checkinPhone = checkin.phone.replace(/\D/g, '').replace(/^91/, '')
    if (
      checkin.business_id === business_id &&
      checkinPhone === cleanPhone &&
      checkin.status === 'pending'
    ) {
      checkin.status = 'approved'
      checkin.result = result
      matched = true
    }
  }

  return matched
}

/**
 * Approves a specific check-in by checkin_id with tenant verification.
 */
export function approvePendingCheckin(
  checkin_id: string,
  business_id: string,
  result: CheckinResult
): boolean {
  pruneExpiredCheckins()
  const checkin = checkinStore.get(checkin_id)
  if (!checkin || checkin.business_id !== business_id) {
    return false
  }

  checkin.status = 'approved'
  checkin.result = result
  return true
}

/**
 * For testing only: clears in-memory check-ins.
 */
export function _resetPendingCheckinsForTesting(): void {
  checkinStore.clear()
}
