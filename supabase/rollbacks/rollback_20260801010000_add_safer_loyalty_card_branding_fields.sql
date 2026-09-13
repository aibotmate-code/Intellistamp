-- Rollback semantic card branding columns
ALTER TABLE public.business_branding
  DROP COLUMN IF EXISTS card_text_color,
  DROP COLUMN IF EXISTS card_muted_text_color,
  DROP COLUMN IF EXISTS empty_stamp_color,
  DROP COLUMN IF EXISTS empty_stamp_border_color;
