import { z } from 'zod'

export const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
})

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(4),
})

export const businessCreateSchema = z.object({
  name: z.string().min(2).max(50),
  category: z.enum(['Cafe', 'Salon', 'Gym', 'Restaurant', 'Jewellery', 'Spa', 'Bakery', 'Other']),
  emoji: z.string().min(1).max(4),
  stamps_required: z.number().int().min(3).max(20),
  reward: z.string().min(3).max(100),
  staff_pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  gmb_link: z.string().url().optional().or(z.literal('')),
  dynamic_qr_enabled: z.boolean(),
  staff_pin_enabled: z.boolean(),
  owner_phone: z.string().regex(/^[6-9]\d{9}$/),
})

export const stampIssueSchema = z.object({
  customer_id: z.string().uuid(),
  business_id: z.string().uuid(),
  token: z.string().length(6),
  staff_pin: z.string().optional(),
  type: z.enum(['regular', 'bonus_review']).optional().default('regular'),
})

export const customerProfileSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  birthday_month: z.string().optional(),
  birthday_day: z.number().int().min(1).max(31).optional(),
  whatsapp_optin: z.boolean(),
})

export const campaignSendSchema = z.object({
  business_id: z.string().uuid(),
  message: z.string().min(1).max(320),
  audience: z.enum(['all', 'inactive', 'near_reward']),
})

export const stampRedeemSchema = z.object({
  customer_id: z.string().uuid(),
  business_id: z.string().uuid(),
  customer_token: z.string().uuid(),
})

export const customerRecoverSchema = z.object({
  business_id: z.string().uuid(),
  phone: z.string().min(1, 'Mobile number is required'),
})

export const customerLookupSchema = z.object({
  business_id: z.string().uuid(),
  phone: z.string().min(1, 'Mobile number is required'),
})
