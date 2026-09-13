-- Rollback Migration: Remove hide_reward_details and hidden_reward_text from business_branding
ALTER TABLE public.business_branding
  DROP COLUMN IF EXISTS hidden_reward_text,
  DROP COLUMN IF EXISTS hide_reward_details;
