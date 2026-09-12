-- Migration: Add hide_reward_details and hidden_reward_text to business_branding
-- Allows businesses to configure custom hidden reward teaser text when locked
ALTER TABLE public.business_branding
  ADD COLUMN IF NOT EXISTS hide_reward_details boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reward_text text NOT NULL DEFAULT 'Surprise reward';

-- Backfill hide_reward_details from businesses table if present
UPDATE public.business_branding bb
SET hide_reward_details = b.hide_reward_details
FROM public.businesses b
WHERE bb.business_id = b.id AND b.hide_reward_details IS NOT NULL;
