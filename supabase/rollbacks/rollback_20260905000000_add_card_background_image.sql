-- Rollback: Remove card background image and overlay opacity from business_branding

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'business_branding'
      AND constraint_name = 'business_branding_overlay_opacity_check'
  ) THEN
    ALTER TABLE public.business_branding DROP CONSTRAINT business_branding_overlay_opacity_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_branding'
      AND column_name = 'card_bg_overlay_opacity'
  ) THEN
    ALTER TABLE public.business_branding DROP COLUMN card_bg_overlay_opacity;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_branding'
      AND column_name = 'card_bg_image_path'
  ) THEN
    ALTER TABLE public.business_branding DROP COLUMN card_bg_image_path;
  END IF;
END $$;
