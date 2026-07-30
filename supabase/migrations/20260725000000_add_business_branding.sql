-- Create business_branding table
CREATE TABLE IF NOT EXISTS public.business_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  logo_path text NULL,
  primary_color text NOT NULL,
  primary_dark_color text NOT NULL,
  primary_light_color text NOT NULL,
  secondary_color text NULL,
  accent_color text NULL,
  background_color text NULL,
  surface_color text NULL,
  text_on_primary text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing
CREATE INDEX IF NOT EXISTS business_branding_business_id_idx ON public.business_branding(business_id);

-- Enable RLS
ALTER TABLE public.business_branding ENABLE ROW LEVEL SECURITY;

-- Branding RLS Policies
CREATE POLICY "Allow public read access" ON public.business_branding
  FOR SELECT USING (
    is_enabled = true OR 
    exists (
      SELECT 1 FROM public.businesses 
      WHERE id = business_branding.business_id 
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow owner all access" ON public.business_branding
  FOR ALL USING (
    exists (
      SELECT 1 FROM public.businesses 
      WHERE id = business_branding.business_id 
        AND owner_id = auth.uid()
    )
  );

-- Storage bucket configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding', 
  'branding', 
  true, 
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public bucket read" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

CREATE POLICY "Allow owner bucket write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'branding' AND
    exists (
      SELECT 1 FROM public.businesses
      WHERE id::text = split_part(name, '/', 1)
        AND owner_id = auth.uid()
    )
  );

-- Grants
GRANT ALL PRIVILEGES ON public.business_branding TO anon, authenticated, service_role;
