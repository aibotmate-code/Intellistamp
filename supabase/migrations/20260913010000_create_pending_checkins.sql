-- Migration: Create durable pending_checkins table and atomic approval RPC
-- Allows static QR + staff PIN mode (Mode C) to operate safely and durably across serverless instances

CREATE TABLE IF NOT EXISTS public.pending_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  result_stamp_id UUID REFERENCES public.stamps(id) ON DELETE SET NULL,
  result_payload JSONB
);

-- Performance & tenant lookup indexes
CREATE INDEX IF NOT EXISTS idx_pending_checkins_biz_status 
  ON public.pending_checkins(business_id, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pending_checkins_lookup 
  ON public.pending_checkins(id, business_id);

CREATE INDEX IF NOT EXISTS idx_pending_checkins_cust_active 
  ON public.pending_checkins(customer_id, business_id, status) 
  WHERE status = 'pending';

-- Row Level Security: enabled and fail-closed
ALTER TABLE public.pending_checkins ENABLE ROW LEVEL SECURITY;

-- ── Atomic Approval RPC ──────────────────────────────────────────────────────
-- Safely acquires row-level lock, checks expiration/tenant boundary,
-- invokes existing issue_stamp_atomic RPC, and updates pending_checkins atomically.
CREATE OR REPLACE FUNCTION public.approve_pending_checkin(
  p_checkin_id UUID,
  p_business_id UUID,
  p_approved_by UUID DEFAULT NULL
) RETURNS JSONB
SET search_path = public, pg_temp
AS $$
DECLARE
  v_checkin RECORD;
  v_stamp_res JSONB;
BEGIN
  -- 1. Acquire transaction row-level lock to prevent concurrent double-approval
  SELECT * INTO v_checkin
  FROM public.pending_checkins
  WHERE id = p_checkin_id AND business_id = p_business_id
  FOR UPDATE;

  -- 2. Verify existence and tenant boundary
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- 3. Verify status
  IF v_checkin.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'already_processed', 'status', v_checkin.status);
  END IF;

  -- 4. Verify expiration
  IF v_checkin.expires_at <= now() THEN
    UPDATE public.pending_checkins SET status = 'expired' WHERE id = p_checkin_id;
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- 5. Invoke canonical issue_stamp_atomic RPC for real stamp issuance
  v_stamp_res := public.issue_stamp_atomic(
    v_checkin.customer_id,
    p_business_id,
    'regular',
    NULL
  );

  -- 6. If stamp issuance failed (e.g. cooldown), do not approve; return error
  IF (v_stamp_res->>'error') IS NOT NULL THEN
    RETURN v_stamp_res;
  END IF;

  -- 7. Stamp succeeded — record approval atomically in same transaction
  UPDATE public.pending_checkins
  SET status = 'approved',
      approved_at = now(),
      approved_by = p_approved_by,
      result_stamp_id = COALESCE((v_stamp_res->'stamp'->>'id')::UUID, (v_stamp_res->>'id')::UUID),
      result_payload = v_stamp_res
  WHERE id = p_checkin_id;

  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', p_checkin_id,
    'stamp_result', v_stamp_res
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicit permissions lockdown: Only service_role may execute approve_pending_checkin
REVOKE ALL ON FUNCTION public.approve_pending_checkin(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_pending_checkin(UUID, UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.approve_pending_checkin(UUID, UUID, UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.approve_pending_checkin(UUID, UUID, UUID) TO service_role;

-- Table permissions: Only service_role may access pending_checkins
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_checkins TO service_role;

