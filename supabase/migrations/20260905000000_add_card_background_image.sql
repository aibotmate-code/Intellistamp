-- Migration: Add card background image and overlay opacity to business_branding
-- Idempotent script for Staging Supabase

DO $$
BEGIN
  -- 1. Add card_bg_image_path if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_branding'
      AND column_name = 'card_bg_image_path'
  ) THEN
    ALTER TABLE public.business_branding ADD COLUMN card_bg_image_path text NULL;
  END IF;

  -- 2. Add card_bg_overlay_opacity if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_branding'
      AND column_name = 'card_bg_overlay_opacity'
  ) THEN
    ALTER TABLE public.business_branding ADD COLUMN card_bg_overlay_opacity numeric NOT NULL DEFAULT 0.6;
  END IF;

  -- 3. Add bounded CHECK constraint for opacity (0.2 to 0.9)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'business_branding'
      AND constraint_name = 'business_branding_overlay_opacity_check'
  ) THEN
    ALTER TABLE public.business_branding
      ADD CONSTRAINT business_branding_overlay_opacity_check
      CHECK (card_bg_overlay_opacity >= 0.2 AND card_bg_overlay_opacity <= 0.9);
  END IF;
END $$;
