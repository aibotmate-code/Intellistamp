import type { ApprovalStatus } from '@/types'

export type BusinessAccessState = 'pending' | 'active' | 'suspended' | 'rejected' | 'expired'

export function getBusinessAccessState(
  business: {
    approval_status: ApprovalStatus | string
    plan_expires_at: string | null
  }
): BusinessAccessState {
  if (business.approval_status === 'pending') return 'pending'
  if (business.approval_status === 'suspended') return 'suspended'
  if (business.approval_status === 'rejected') return 'rejected'
  
  if (business.approval_status === 'approved') {
    if (business.plan_expires_at && new Date(business.plan_expires_at).getTime() < Date.now()) {
      return 'expired'
    }
    return 'active'
  }
  
  // Default fallback if we get an unknown status somehow
  return 'pending'
}
