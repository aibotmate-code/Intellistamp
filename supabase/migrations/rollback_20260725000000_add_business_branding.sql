-- Remove storage policies
DROP POLICY IF EXISTS "Allow owner bucket write" ON storage.objects;
DROP POLICY IF EXISTS "Allow public bucket read" ON storage.objects;

-- Remove storage bucket
DELETE FROM storage.buckets WHERE id = 'branding';

-- Drop table business_branding
DROP TABLE IF EXISTS public.business_branding CASCADE;
