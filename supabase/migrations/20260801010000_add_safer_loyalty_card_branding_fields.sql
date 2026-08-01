-- Add nullable co-branding color columns to business_branding
ALTER TABLE public.business_branding
  ADD COLUMN IF NOT EXISTS card_text_color text,
  ADD COLUMN IF NOT EXISTS card_muted_text_color text,
  ADD COLUMN IF NOT EXISTS empty_stamp_color text,
  ADD COLUMN IF NOT EXISTS empty_stamp_border_color text;

-- Backfill staging business intellistamp-staging-demo
UPDATE public.business_branding
SET 
  card_text_color = '#173B39',
  card_muted_text_color = '#6B7C7A',
  empty_stamp_color = '#E7EFEE',
  empty_stamp_border_color = '#99BFBD'
WHERE business_id IN (
  SELECT id FROM public.businesses WHERE slug = 'intellistamp-staging-demo'
);
