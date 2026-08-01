CREATE OR REPLACE FUNCTION issue_stamp_atomic(
  p_customer_id UUID,
  p_business_id UUID,
  p_type TEXT,
  p_stamp_token TEXT DEFAULT NULL,
  p_cooldown_hours INT DEFAULT 4
) RETURNS JSONB AS $$
DECLARE
  v_lock_key BIGINT;
  v_last_stamp TIMESTAMP;
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
BEGIN
  -- 1. Acquire transaction-level advisory lock based on customer + business hash
  v_lock_key := abs(hashtext(p_customer_id::text || p_business_id::text))::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 2. Check Cooldown
  SELECT stamped_at INTO v_last_stamp
  FROM stamps
  WHERE customer_id = p_customer_id AND business_id = p_business_id
  ORDER BY stamped_at DESC LIMIT 1;

  IF v_last_stamp IS NOT NULL THEN
    v_hours_left := CEIL((p_cooldown_hours * 3600 - EXTRACT(EPOCH FROM (now() - v_last_stamp))) / 3600);
    IF v_hours_left > 0 THEN
      RETURN jsonb_build_object('error', 'cooldown', 'hours_left', v_hours_left);
    END IF;
  END IF;

  -- 3. Upsert customer enrollment (to be safe)
  INSERT INTO business_customers (business_id, customer_id) 
  VALUES (p_business_id, p_customer_id) 
  ON CONFLICT (business_id, customer_id) DO NOTHING;
  
  -- If bonus_review, update review_claimed
  IF p_type = 'bonus_review' THEN
    UPDATE business_customers SET review_claimed = true WHERE business_id = p_business_id AND customer_id = p_customer_id;
  END IF;

  -- 4. Insert Stamp
  BEGIN
    INSERT INTO stamps (customer_id, business_id, type, stamp_token)
    VALUES (p_customer_id, p_business_id, p_type, p_stamp_token)
    RETURNING * INTO v_stamp;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'token_used');
  END;

  -- 5. Calculate logic
  SELECT stamps_required, conflict_priority, reward 
  INTO v_stamps_required, v_conflict_priority, v_reward
  FROM businesses WHERE id = p_business_id;

  SELECT count(*) INTO v_total_stamps
  FROM stamps WHERE customer_id = p_customer_id AND business_id = p_business_id;

  v_stamp_complete := (v_total_stamps % v_stamps_required = 0);

  -- Milestone calculation
  SELECT m.id, to_jsonb(m.*) INTO v_milestone_id, v_milestone
  FROM milestones m
  WHERE m.business_id = p_business_id
    AND m.is_active = true
    AND m.visit_number <= v_total_stamps
    AND NOT EXISTS (
      SELECT 1 FROM milestone_claims c 
      WHERE c.milestone_id = m.id AND c.customer_id = p_customer_id
    )
  ORDER BY m.visit_number ASC LIMIT 1;

  -- Resolve conflict
  IF v_stamp_complete AND v_milestone_id IS NOT NULL THEN
    IF v_conflict_priority = 'stamp' THEN
      v_reward_result := jsonb_build_object('type', 'stamp', 'reward', v_reward, 'deferred_milestone', v_milestone);
    ELSE
      INSERT INTO milestone_claims (customer_id, business_id, milestone_id) VALUES (p_customer_id, p_business_id, v_milestone_id);
      v_reward_result := jsonb_build_object('type', 'milestone', 'milestone', v_milestone, 'deferred_stamp', true);
    END IF;
  ELSIF v_stamp_complete THEN
    v_reward_result := jsonb_build_object('type', 'stamp', 'reward', v_reward);
  ELSIF v_milestone_id IS NOT NULL THEN
    INSERT INTO milestone_claims (customer_id, business_id, milestone_id) VALUES (p_customer_id, p_business_id, v_milestone_id);
    v_reward_result := jsonb_build_object('type', 'milestone', 'milestone', v_milestone);
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'stamp', to_jsonb(v_stamp), 
    'total_stamps', v_total_stamps, 
    'reward_result', v_reward_result
  );
END;
$$ LANGUAGE plpgsql;
