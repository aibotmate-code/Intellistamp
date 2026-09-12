-- Migration: Add non-destructive positioning and zoom controls for logo and background pattern
-- Supports logo_position_x, logo_position_y, logo_scale, background_position_x, background_position_y, background_scale
ALTER TABLE public.business_branding
  ADD COLUMN IF NOT EXISTS logo_position_x NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS logo_position_y NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS logo_scale NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS background_position_x NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS background_position_y NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS background_scale NUMERIC NOT NULL DEFAULT 1;
