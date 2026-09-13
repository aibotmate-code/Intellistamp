-- Rollback Migration: Remove hide_reward_details column from businesses table
ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS hide_reward_details;
