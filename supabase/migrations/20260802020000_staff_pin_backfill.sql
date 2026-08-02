-- 1. Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Backfill hashes for plaintext PINs
UPDATE public.businesses
SET 
  staff_pin_hash = public.crypt(btrim(staff_pin), public.gen_salt('bf', 10)),
  staff_pin = NULL  -- Clear the plaintext safely by nulling it
WHERE 
  staff_pin IS NOT NULL 
  AND btrim(staff_pin) <> ''
  AND staff_pin NOT LIKE '$2a$%' -- Prevent double hashing if already bcrypt
  AND staff_pin_hash IS NULL;
