export type Plan = 'free' | 'pro'
export type StampType = 'regular' | 'bonus_review'
export type CampaignAudience = 'all' | 'inactive' | 'near_reward'
export type ConflictPriority = 'stamp' | 'milestone'

export interface Business {
  id: string
  name: string
  emoji: string
  category: string
  slug: string
  stamps_required: number
  reward: string
  staff_pin: string
  gmb_link?: string
  dynamic_qr_enabled: boolean
  staff_pin_enabled: boolean
  whatsapp_enabled: boolean
  plan: Plan
  owner_phone?: string
  created_at: string
  conflict_priority: ConflictPriority
  stamps_required_updated_at?: string
  milestones?: Milestone[]
}

export interface Customer {
  id: string
  phone: string
  customer_token: string
  name?: string
  birthday_month?: string
  birthday_day?: number
  whatsapp_optin: boolean
  created_at: string
}

export interface Stamp {
  id: string
  customer_id: string
  business_id: string
  type: StampType
  stamped_at: string
  stamp_token?: string | null
}

export interface BusinessCustomer {
  id: string
  business_id: string
  customer_id: string
  review_claimed: boolean
  enrolled_at: string
  customer?: Customer
  total_stamps?: number
  card_stamps?: number
  cards_redeemed?: number
}

export interface Campaign {
  id: string
  business_id: string
  message: string
  audience: CampaignAudience
  sent_at: string
  total_sent: number
  delivered: number
}

export interface StampCardState {
  total_stamps: number
  card_stamps: number
  cards_completed: number
  can_stamp: boolean
  cooldown_remaining_hours?: number
  redeemable: boolean
}

export interface Milestone {
  id: string
  business_id: string
  visit_number: number
  badge: string
  reward: string
  is_active: boolean
  created_at: string
}

export interface MilestoneClaim {
  id: string
  customer_id: string
  business_id: string
  milestone_id: string
  claimed_at: string
}

export interface MilestoneWithStatus extends Milestone {
  earned: boolean
  visits_remaining: number
}

export interface RewardResult {
  type: 'stamp' | 'milestone'
  reward?: string
  milestone?: Milestone
  deferred_milestone?: Milestone
  deferred_stamp?: boolean
}
