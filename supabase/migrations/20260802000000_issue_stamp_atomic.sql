-- 1. Drop the obsolete 5-parameter version to prevent accidental execution
DROP FUNCTION IF EXISTS public.issue_stamp_atomic(uuid, uuid, text, text, integer);

-- 2. Create the hardened RPC function (4 parameters)
CREATE OR REPLACE FUNCTION public.issue_stamp_atomic(
  p_customer_id UUID,
  p_business_id UUID,
  p_type TEXT,
  p_stamp_token TEXT DEFAULT NULL
) RETURNS JSONB 
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cooldown_hours CONSTANT INT := 4;
  v_last_stamp TIMESTAMPTZ;
  v_hours_left INT;
  v_stamp RECORD;
  v_total_stamps INT;
  v_stamps_required INT;
  v_conflict_priority TEXT;
  v_reward TEXT;
  v_milestone_id UUID;
  v_milestone JSONB;
  v_stamp_complete BOOLEAN;
  v_reward_result JSONB;
  v_constraint_name TEXT;
BEGIN
  -- 1. Validate p_type
  IF p_type NOT IN ('regular', 'bonus_review') THEN
    RETURN jsonb_build_object('error', 'invalid_type');
  END IF;

  -- 2. Acquire transaction-level advisory lock using deterministic 2-integer form
  PERFORM pg_advisory_xact_lock(
    hashtext(p_business_id::text), 
    hashtext(p_customer_id::text)
  );

  -- 3. Verify entities and association (prevent cross-business creation)
  SELECT b.stamps_required, b.conflict_priority, b.reward
  INTO v_stamps_required, v_conflict_priority, v_reward
  FROM public.businesses b
  JOIN public.business_customers bc ON bc.business_id = b.id
  WHERE b.id = p_business_id AND bc.customer_id = p_customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_customer');
  END IF;

  -- 4. Validate reward configuration
  IF v_stamps_required IS NULL OR v_stamps_required <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_configuration');
  END IF;

  -- 5. Check Cooldown using trusted internal constant
  SELECT stamped_at INTO v_last_stamp
  FROM public.stamps
  WHERE customer_id = p_customer_id AND business_id = p_business_id
  ORDER BY stamped_at DESC LIMIT 1;

  IF v_last_stamp IS NOT NULL THEN
    v_hours_left := CEIL((v_cooldown_hours * 3600 - EXTRACT(EPOCH FROM (now() - v_last_stamp))) / 3600);
    IF v_hours_left > 0 THEN
      RETURN jsonb_build_object('error', 'cooldown', 'hours_left', v_hours_left);
    END IF;
  END IF;

  -- 6. Insert Stamp (RETURNING only safe fields)
  BEGIN
    INSERT INTO public.stamps (customer_id, business_id, type, stamp_token)
    VALUES (p_customer_id, p_business_id, p_type, p_stamp_token)
    RETURNING id, type, stamped_at INTO v_stamp;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
    -- Only return token_used if it was specifically the QR replay protection index
    IF v_constraint_name = 'stamps_token_dedup_idx' THEN
      RETURN jsonb_build_object('error', 'token_used');
    ELSE
      RETURN jsonb_build_object('error', 'internal_integrity_error');
    END IF;
  END;

  -- 7. Update analytics/flags ONLY AFTER successful stamp insert
  IF p_type = 'bonus_review' THEN
    UPDATE public.business_customers 
    SET review_claimed = true 
    WHERE business_id = p_business_id AND customer_id = p_customer_id;
  END IF;

  -- 8. Logic and Rewards
  SELECT count(*) INTO v_total_stamps
  FROM public.stamps 
  WHERE customer_id = p_customer_id AND business_id = p_business_id;

  v_stamp_complete := (v_total_stamps % v_stamps_required = 0);

  -- Determine next milestone
  SELECT m.id, to_jsonb(m.*) INTO v_milestone_id, v_milestone
  FROM public.milestones m
  WHERE m.business_id = p_business_id
    AND m.is_active = true
    AND m.visit_number <= v_total_stamps
    AND NOT EXISTS (
      SELECT 1 FROM public.milestone_claims c 
      WHERE c.milestone_id = m.id 
        AND c.customer_id = p_customer_id
        AND c.business_id = p_business_id
    )
  ORDER BY m.visit_number ASC LIMIT 1;

  -- Resolve priority safely
  BEGIN
    IF v_stamp_complete AND v_milestone_id IS NOT NULL THEN
      IF v_conflict_priority = 'stamp' THEN
        v_reward_result := jsonb_build_object('type', 'stamp', 'reward', v_reward, 'deferred_milestone', v_milestone);
      ELSE
        INSERT INTO public.milestone_claims (customer_id, business_id, milestone_id) VALUES (p_customer_id, p_business_id, v_milestone_id);
        v_reward_result := jsonb_build_object('type', 'milestone', 'milestone', v_milestone, 'deferred_stamp', true);
      END IF;
    ELSIF v_stamp_complete THEN
      v_reward_result := jsonb_build_object('type', 'stamp', 'reward', v_reward);
    ELSIF v_milestone_id IS NOT NULL THEN
      INSERT INTO public.milestone_claims (customer_id, business_id, milestone_id) VALUES (p_customer_id, p_business_id, v_milestone_id);
      v_reward_result := jsonb_build_object('type', 'milestone', 'milestone', v_milestone);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    -- Fallback for concurrent claim resolution without crashing the whole successful stamp
    v_reward_result := jsonb_build_object('type', 'milestone', 'milestone', v_milestone, 'note', 'concurrent_claim_resolved');
  END;

  -- Return controlled JSON structure (excluding stamp_token)
  RETURN jsonb_build_object(
    'success', true, 
    'stamp', jsonb_build_object(
      'id', v_stamp.id,
      'type', v_stamp.type,
      'stamped_at', v_stamp.stamped_at
    ), 
    'total_stamps', v_total_stamps, 
    'reward_result', v_reward_result
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Explicit permissions lockdown for the active 4-parameter function
REVOKE ALL ON FUNCTION public.issue_stamp_atomic(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_stamp_atomic(uuid, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.issue_stamp_atomic(uuid, uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stamp_atomic(uuid, uuid, text, text) TO service_role;
