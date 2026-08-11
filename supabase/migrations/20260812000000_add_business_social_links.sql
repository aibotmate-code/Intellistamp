-- Create business_social_links table
CREATE TABLE IF NOT EXISTS public.business_social_links (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  google_review_url text NULL,
  instagram_url text NULL,
  facebook_url text NULL,
  youtube_url text NULL,
  x_url text NULL,
  whatsapp_number text NULL,
  whatsapp_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_social_links ENABLE ROW LEVEL SECURITY;

-- Owner management policy
CREATE POLICY "Allow owner all access" ON public.business_social_links
  FOR ALL USING (
    exists (
      SELECT 1 FROM public.businesses 
      WHERE id = business_social_links.business_id 
        AND owner_id = auth.uid()
    )
  );

-- No public read access via RLS. Must go through Next.js server.
-- (Fail closed for anon/public)

-- Create updated_at trigger (Assuming handle_updated_at or similar exists. If not, this is the standard supabase way)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_social_links_updated_at ON public.business_social_links;
CREATE TRIGGER update_business_social_links_updated_at
BEFORE UPDATE ON public.business_social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT ALL PRIVILEGES ON public.business_social_links TO authenticated, service_role;
