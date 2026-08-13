export type Plan = 'free' | 'pro'
export type ApprovalStatus = 'pending' | 'approved' | 'suspended' | 'rejected'
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
  has_staff_pin?: boolean
  gmb_link?: string
  dynamic_qr_enabled: boolean
  staff_pin_enabled: boolean
  whatsapp_enabled: boolean
  plan: Plan
  approval_status: ApprovalStatus
  plan_expires_at: string | null
  owner_phone?: string
  created_at: string
  conflict_priority: ConflictPriority
  stamps_required_updated_at?: string
  milestones?: Milestone[]
  branding?: BusinessBranding | null
  social_links?: BusinessSocialLinks | null
}

export interface BusinessSocialLinks {
  business_id: string
  google_review_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  youtube_url?: string | null
  x_url?: string | null
  whatsapp_number?: string | null
  whatsapp_message?: string | null
  created_at?: string
  updated_at?: string
}

export interface PublicSocialLinks {
  google_review_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  youtube_url: string | null
  x_url: string | null
  whatsapp_url: string | null
}

export interface BusinessBranding {
  id?: string
  business_id: string
  logo_url?: string | null
  logo_path?: string | null
  primary_color: string
  primary_dark_color: string
  primary_light_color: string
  secondary_color?: string | null
  accent_color?: string | null
  background_color?: string | null
  surface_color?: string | null
  text_on_primary: string
  is_enabled: boolean
  card_text_color?: string | null
  card_muted_text_color?: string | null
  empty_stamp_color?: string | null
  empty_stamp_border_color?: string | null
  created_at?: string
  updated_at?: string
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

