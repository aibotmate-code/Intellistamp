-- 1. Create schema-qualified table safely (upgrade path)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);

ALTER TABLE public.rate_limits 
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_rate_limit_key_length'
  ) THEN
    ALTER TABLE public.rate_limits 
      ADD CONSTRAINT chk_rate_limit_key_length CHECK (char_length(btrim(key)) BETWEEN 1 AND 256);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_rate_limit_count_positive'
  ) THEN
    ALTER TABLE public.rate_limits 
      ADD CONSTRAINT chk_rate_limit_count_positive CHECK (count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON public.rate_limits(reset_at);

-- 2. Enable RLS and lock down table access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limits FROM anon;
REVOKE ALL ON TABLE public.rate_limits FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limits TO service_role;

-- 3. Replace check_rate_limit with atomic UPSERT
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS jsonb 
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
  v_new_reset_at timestamptz;
  v_current_count integer;
  v_current_reset_at timestamptz;
  v_remaining integer;
  v_retry_after integer;
  v_ok boolean;
BEGIN
  v_key := btrim(p_key);
  
  IF v_key IS NULL OR v_key = '' OR char_length(v_key) > 256 THEN
    RAISE EXCEPTION 'Invalid rate limit key';
  END IF;

  IF p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'Invalid limit range';
  END IF;

  IF p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid window seconds range';
  END IF;

  v_new_reset_at := now() + make_interval(secs => p_window_seconds);

  WITH upsert AS (
    INSERT INTO public.rate_limits (key, count, reset_at, created_at, updated_at)
    VALUES (v_key, 1, v_new_reset_at, now(), now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE 
                WHEN public.rate_limits.reset_at <= now() THEN 1 
                ELSE LEAST(public.rate_limits.count + 1, p_limit + 1)
              END,
      reset_at = CASE 
                   WHEN public.rate_limits.reset_at <= now() THEN v_new_reset_at 
                   ELSE public.rate_limits.reset_at 
                 END,
      updated_at = now()
    RETURNING count, reset_at
  )
  SELECT count, reset_at INTO v_current_count, v_current_reset_at FROM upsert;

  v_ok := v_current_count <= p_limit;
  v_remaining := GREATEST(0, p_limit - v_current_count);
  v_retry_after := CASE WHEN v_ok THEN 0 ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_current_reset_at - now())))::integer) END;

  RETURN jsonb_build_object(
    'ok', v_ok,
    'remaining', v_remaining,
    'reset_at', v_current_reset_at,
    'retry_after', v_retry_after
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Lock down function execution
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- 5. Bounded cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits(
  p_batch_size integer DEFAULT 500
) RETURNS integer
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'Invalid batch size';
  END IF;

  WITH to_delete AS (
    SELECT key FROM public.rate_limits
    WHERE reset_at < (now() - interval '1 day')
    ORDER BY reset_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  deleted AS (
    DELETE FROM public.rate_limits
    WHERE key IN (SELECT key FROM to_delete)
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Lock down cleanup function
REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits(integer) TO service_role;
