-- Add approval status and plan expiration to businesses

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz DEFAULT null;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_approval_status_check
CHECK (
  approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'rejected'::text])
);

-- Note: The staging migration was applied manually and existing businesses were updated to 'approved'
-- UPDATE public.businesses SET approval_status = 'approved';
