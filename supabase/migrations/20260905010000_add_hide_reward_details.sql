-- Migration: Add hide_reward_details column to businesses table
-- Allows businesses / merchants to hide locked milestone reward descriptions from customer view
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS hide_reward_details boolean NOT NULL DEFAULT false;
