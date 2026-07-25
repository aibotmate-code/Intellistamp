-- Security containment migration — 2026-07-25
-- PURPOSE: Add staff_pin_hash column and redemption-supporting indexes.
-- STATUS:  NOT YET APPLIED. Apply via Supabase Dashboard → SQL Editor.
--
-- PREFLIGHT:
--   Run this query first to confirm the column does not yet exist:
--     SELECT column_name FROM information_schema.columns
--     WHERE table_name='businesses' AND column_name='staff_pin_hash';
--   If it returns a row, stop — migration is already applied.
--
-- IMPACT:
--   - Adds one nullable text column to businesses (no data loss).
--   - Adds one index on business_customers (brief lock on small table).
--   - Does NOT modify any existing rows.
--   - After applying, existing PIN verification falls back to plaintext
--     comparison until a separate PIN-migration job hashes each row.

-- 1. Add staff_pin_hash column (nullable; NULL = not yet hashed)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_pin_hash text;

-- 2. Index to speed up optimistic-lock redemption update
--    (business_customers already has composite unique on (business_id, customer_id)
--     which creates an implicit btree; this index is additive only if not present)
CREATE INDEX IF NOT EXISTS business_customers_business_customer_idx
  ON business_customers(business_id, customer_id);

-- ROLLBACK (if needed — run manually):
--   ALTER TABLE businesses DROP COLUMN IF EXISTS staff_pin_hash;
--   DROP INDEX IF EXISTS business_customers_business_customer_idx;

-- VERIFICATION:
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name='businesses' AND column_name='staff_pin_hash';
--
--   SELECT indexname FROM pg_indexes
--   WHERE tablename='business_customers'
--     AND indexname='business_customers_business_customer_idx';
