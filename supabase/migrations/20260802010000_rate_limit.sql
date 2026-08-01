CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT DEFAULT 1,
  reset_at TIMESTAMP WITH TIME ZONE
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS JSONB AS $$
DECLARE
  v_entry rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_entry FROM rate_limits WHERE key = p_key FOR UPDATE;
  
  IF v_entry.key IS NULL THEN
    INSERT INTO rate_limits (key, count, reset_at) 
    VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= now() THEN now() + make_interval(secs => p_window_seconds) ELSE rate_limits.reset_at END;
    
    SELECT * INTO v_entry FROM rate_limits WHERE key = p_key;
    
    IF v_entry.count > p_limit THEN
       RETURN jsonb_build_object('ok', false, 'retry_after', CEIL(EXTRACT(EPOCH FROM (v_entry.reset_at - now()))));
    END IF;
    
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF now() >= v_entry.reset_at THEN
    UPDATE rate_limits SET count = 1, reset_at = now() + make_interval(secs => p_window_seconds) WHERE key = p_key;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_entry.count >= p_limit THEN
    RETURN jsonb_build_object('ok', false, 'retry_after', CEIL(EXTRACT(EPOCH FROM (v_entry.reset_at - now()))));
  END IF;

  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql;
